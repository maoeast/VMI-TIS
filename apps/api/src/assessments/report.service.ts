import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SCALE_DATA_STATUS_LABELS,
  SCALE_PROVENANCE_REGISTRY,
  SCALE_SCORE_SOURCE_LABELS,
  resolveScaleScoreSource,
  type ScaleDataStatus,
  type ScaleScoreSource,
} from '@vmi-tis/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/** 报告本地配色：数据状态 → CSS 类名（颜色只在本文件维护，文案统一取自种子标签表）。 */
const DATA_STATUS_BADGE_CLASS: Record<ScaleDataStatus, string> = {
  OFFICIAL_LICENSED: 'status-official',
  MANUAL_ENTRY_ONLY: 'status-manual',
  PROJECT_APPROXIMATION: 'status-project',
  STRUCTURE_ONLY: 'status-structure',
};

@Injectable()
export class ReportService {
  private readonly reportDir = resolve(__dirname, '../../data/reports');

  constructor(private readonly prisma: PrismaService) {}

  async generateAssessmentReport(recordId: string): Promise<{
    recordId: string;
    reportFileUrl: string;
    format: 'html';
    generatedAt: string;
  }> {
    const record = await this.prisma.assessmentRecord.findUnique({
      where: { id: recordId },
      include: { student: true },
    });

    if (!record) {
      throw new NotFoundException('评估记录不存在');
    }

    mkdirSync(this.reportDir, { recursive: true });

    const generatedAt = new Date().toISOString();
    const reportFileUrl = `/api/reports/${record.id}.html`;
    const html = this.renderHtml(record, generatedAt);

    writeFileSync(
      resolve(this.reportDir, `${record.id}.html`),
      html,
      'utf8',
    );

    await this.prisma.assessmentRecord.update({
      where: { id: record.id },
      data: { reportFileUrl },
    });

    return {
      recordId: record.id,
      reportFileUrl,
      format: 'html',
      generatedAt,
    };
  }

  private renderHtml(
    record: {
      id: string;
      evalPhase: string;
      autoLevel: string | null;
      npcCm: number | null;
      accomFacilityCpm: number | null;
      beeryVmiRaw: number | null;
      beeryVmiStd: number | null;
      beeryVpStd: number | null;
      beeryMcStd: number | null;
      nsucoScoreJson: string | null;
      tvps4Std: number | null;
      mvpt3Std: number | null;
      mvpt4Std: number | null;
      demNormTier: string | null;
      radarScoresJson: string | null;
      assessmentMetaJson: string | null;
      createdAt: Date;
      student: { name: string; studentCode: string; schoolScene: string };
    },
    generatedAt: string,
  ): string {
    const radar = this.parseJson(record.radarScoresJson);
    const meta = this.parseJson(record.assessmentMetaJson);
    const grading = this.asRecord(meta.grading);
    const beery = this.asRecord(meta.beery);
    const dem = this.asRecord(meta.dem);
    const tvps4 = this.asRecord(meta.tvps4);
    const mvpt4 = this.asRecord(meta.mvpt4);
    const nsuco = this.parseJson(record.nsucoScoreJson);
    const escape = (value: unknown): string =>
      String(value ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // 数据状态文案与分数来源判定都走种子单一来源，报告不另写一套中文。
    const statusBadge = (status: ScaleDataStatus): string =>
      `<span class="status-badge ${DATA_STATUS_BADGE_CLASS[status]}">${escape(
        SCALE_DATA_STATUS_LABELS[status].label,
      )}</span>`;
    const sourceText = (source: ScaleScoreSource): string =>
      escape(SCALE_SCORE_SOURCE_LABELS[source]);
    const hasMeta = (value: Record<string, unknown>): boolean =>
      Object.keys(value).length > 0;

    const mvpt4Weakest = Array.isArray(mvpt4.weakestDomains)
      ? (mvpt4.weakestDomains as Array<Record<string, unknown>>)
      : [];
    const mvpt4WeakestText =
      mvpt4Weakest.length > 0
        ? mvpt4Weakest
            .map(
              (item) =>
                `${escape(item.domainNameCn)} ${escape(item.accuracyPct)}%`,
            )
            .join('、')
        : '无（未录入逐题或各维度正确率 ≥65%）';

    // meta.beery 的键是 main / vp / mc（不是 beeryVmi）；只有录入了对应原始分才有该键。
    const beeryStatus = SCALE_PROVENANCE_REGISTRY.BEERY_VMI_6.dataStatus;
    const beeryMainSource = resolveScaleScoreSource({
      dataStatus: beeryStatus,
      standardScore: record.beeryVmiStd,
      normApplied: null,
      hasRawInput: record.beeryVmiRaw != null,
    });
    const beeryVpSource = resolveScaleScoreSource({
      dataStatus: beeryStatus,
      standardScore: record.beeryVpStd,
      normApplied: null,
      hasRawInput: hasMeta(this.asRecord(beery.vp)),
    });
    const beeryMcSource = resolveScaleScoreSource({
      dataStatus: beeryStatus,
      standardScore: record.beeryMcStd,
      normApplied: null,
      hasRawInput: hasMeta(this.asRecord(beery.mc)),
    });
    const tvps4Status = SCALE_PROVENANCE_REGISTRY.TVPS_4.dataStatus;
    const tvps4Source = resolveScaleScoreSource({
      dataStatus: tvps4Status,
      standardScore: record.tvps4Std,
      normApplied: null,
      hasRawInput: hasMeta(tvps4),
    });
    const mvpt4Status = SCALE_PROVENANCE_REGISTRY.MVPT_4.dataStatus;
    const mvpt4Source = resolveScaleScoreSource({
      dataStatus: mvpt4Status,
      standardScore: record.mvpt4Std,
      normApplied:
        typeof mvpt4.normApplied === 'boolean' ? mvpt4.normApplied : null,
      hasRawInput: mvpt4.rawScore != null,
    });
    const demStatus = SCALE_PROVENANCE_REGISTRY.DEM.dataStatus;
    const demSource = resolveScaleScoreSource({
      dataStatus: demStatus,
      standardScore: record.demNormTier,
      normApplied: null,
      hasRawInput: hasMeta(dem),
    });
    const nsucoStatus = SCALE_PROVENANCE_REGISTRY.NSUCO.dataStatus;
    const nsucoPursuit =
      typeof nsuco.pursuit === 'number' ? nsuco.pursuit : null;
    const nsucoSaccade =
      typeof nsuco.saccade === 'number' ? nsuco.saccade : null;
    const nsucoSource = resolveScaleScoreSource({
      dataStatus: nsucoStatus,
      standardScore: nsucoPursuit ?? nsucoSaccade ?? null,
      normApplied: null,
      hasRawInput: false,
    });

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>VMI-TIS 评估报告 · ${escape(record.student.name)}</title>
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #1e293b; margin: 40px; }
    h1 { color: #0F4C5C; font-size: 22px; }
    h2 { color: #0F4C5C; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; text-align: left; }
    th { background: #f1f5f9; width: 30%; }
    .level { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-weight: 700; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .status-official { background: #d1fae5; color: #065f46; }
    .status-manual { background: #dbeafe; color: #1e40af; }
    .status-project { background: #fef3c7; color: #92400e; }
    .status-structure { background: #f3f4f6; color: #1f2937; }
    .status-table th { width: auto; }
    .footer { margin-top: 32px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>孤独症学生视觉运动整合（VMI）评估报告</h1>
  <table>
    <tr><th>学号</th><td>${escape(record.student.studentCode)}</td></tr>
    <tr><th>姓名</th><td>${escape(record.student.name)}</td></tr>
    <tr><th>班级 / 场景</th><td>${escape(record.student.schoolScene)}</td></tr>
    <tr><th>评估阶段</th><td>${escape(record.evalPhase)}</td></tr>
    <tr><th>评估日期</th><td>${escape(record.createdAt.toISOString().slice(0, 10))}</td></tr>
    <tr><th>综合定级</th><td><span class="level">${escape(record.autoLevel)}</span></td></tr>
  </table>

  <h2>一、视光与视觉效率</h2>
  <table>
    <tr><th>NPC（集合近点）</th><td>${escape(record.npcCm)} cm</td></tr>
    <tr><th>调节灵活度</th><td>${escape(record.accomFacilityCpm)} cpm</td></tr>
    <tr><th>DEM 眼动</th><td>${escape(record.demNormTier)}</td></tr>
  </table>

  <h2>二、视觉感知与视觉运动整合</h2>
  <table>
    <tr><th>Beery VMI-6 标准分</th><td>${escape(record.beeryVmiStd)}</td></tr>
    <tr><th>Beery VMI-6 数据状态</th><td>${statusBadge(beeryStatus)}</td></tr>
    <tr><th>Beery VMI-6 分数来源</th><td>${sourceText(beeryMainSource)}</td></tr>
    <tr><th>Beery VP 标准分</th><td>${escape(record.beeryVpStd)}</td></tr>
    <tr><th>Beery VP 数据状态</th><td>${statusBadge(beeryStatus)}</td></tr>
    <tr><th>Beery VP 分数来源</th><td>${sourceText(beeryVpSource)}</td></tr>
    <tr><th>Beery MC 标准分</th><td>${escape(record.beeryMcStd)}</td></tr>
    <tr><th>Beery MC 数据状态</th><td>${statusBadge(beeryStatus)}</td></tr>
    <tr><th>Beery MC 分数来源</th><td>${sourceText(beeryMcSource)}</td></tr>
    <tr><th>TVPS-4 标准分</th><td>${escape(record.tvps4Std)}</td></tr>
    <tr><th>TVPS-4 数据状态</th><td>${statusBadge(tvps4Status)}</td></tr>
    <tr><th>TVPS-4 分数来源</th><td>${sourceText(tvps4Source)}</td></tr>
    <tr><th>MVPT-4 标准分</th><td>${escape(record.mvpt4Std)}</td></tr>
    <tr><th>MVPT-4 数据状态</th><td>${statusBadge(mvpt4Status)}</td></tr>
    <tr><th>MVPT-4 分数来源</th><td>${sourceText(mvpt4Source)}</td></tr>
    <tr><th>MVPT-4 原始分 / 百分位</th><td>${escape(mvpt4.rawScore)} / ${escape(mvpt4.percentileRank)}</td></tr>
    <tr><th>MVPT-4 等效年龄 / 说明</th><td>${escape(mvpt4.ageEquivalentLabel)} / ${escape(mvpt4.normNote)}</td></tr>
    <tr><th>MVPT-4 薄弱维度</th><td>${escape(mvpt4WeakestText)}</td></tr>
    <tr><th>DEM 分型</th><td>${escape(record.demNormTier)}</td></tr>
    <tr><th>DEM 数据状态</th><td>${statusBadge(demStatus)}</td></tr>
    <tr><th>DEM 分数来源</th><td>${sourceText(demSource)}</td></tr>
    <tr><th>NSUCO 追视 / 扫视 / 聚散</th><td>${escape(nsuco.pursuit)} / ${escape(nsuco.saccade)} / ${escape(nsuco.vergence)}</td></tr>
    <tr><th>NSUCO 数据状态</th><td>${statusBadge(nsucoStatus)}</td></tr>
    <tr><th>NSUCO 分数来源</th><td>${sourceText(nsucoSource)}</td></tr>
    <tr><th>MVPT-3 标准分（历史）</th><td>${escape(record.mvpt3Std)}</td></tr>
  </table>

  <h2>三、六维能力雷达</h2>
  <table>
    ${Object.entries(radar)
      .map(
        ([key, value]) =>
          `<tr><th>${escape(key)}</th><td>${escape(value)}</td></tr>`,
      )
      .join('') || '<tr><td colspan="2">本次评估未录入六维分数</td></tr>'}
  </table>

  ${this.renderGradingSection(grading, escape)}
  ${this.renderDemSection(dem, escape)}
  ${this.renderTvps4Section(tvps4, escape)}
  ${this.renderScaleStatusSection(escape)}

  <h2>八、训练处方建议</h2>
  <p>建议每周 3–4 次、每次 35 分钟结构化训练；数字训练单次不超过 15 分钟，并配合每日 8–10 分钟家庭泛化练习。</p>

  <div class="footer">生成时间：${escape(generatedAt)} · 报告编号：${escape(record.id)}</div>
</body>
</html>`;
  }

  private parseJson(value: string | null): Record<string, unknown> {
    if (!value) {
      return {};
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private renderGradingSection(
    grading: Record<string, unknown>,
    escape: (value: unknown) => string,
  ): string {
    if (Object.keys(grading).length === 0) {
      return '<h2>四、评估结论与训练处方</h2><p>本记录创建于评估模块接入前，无详细定级分析。</p>';
    }
    const cards = Array.isArray(grading.recommendedSopCardCodes)
      ? grading.recommendedSopCardCodes.join('、')
      : '—';
    return `<h2>四、评估结论与训练处方</h2>
  <table>
    <tr><th>推荐层级</th><td>${escape(grading.recommendedLevelLabel ?? grading.recommendedLevel)}</td></tr>
    <tr><th>红区判定</th><td>${escape(grading.triageStatus)}</td></tr>
    <tr><th>临床瓶颈分析</th><td>${escape(grading.clinicalBottleneckAnalysis)}</td></tr>
    <tr><th>推荐操作卡</th><td>${escape(cards)}</td></tr>
  </table>`;
  }

  private renderDemSection(
    dem: Record<string, unknown>,
    escape: (value: unknown) => string,
  ): string {
    if (Object.keys(dem).length === 0) {
      return '<h2>五、DEM 眼动</h2><p>本次评估未录入 DEM。</p>';
    }
    return `<h2>五、DEM 眼动</h2>
  <table>
    <tr><th>纵向总用时</th><td>${escape(dem.verticalTotalSec)} s</td></tr>
    <tr><th>横向修正用时</th><td>${escape(dem.horizontalAdjustedSec)} s</td></tr>
    <tr><th>纵横比</th><td>${escape(dem.demRatio)}</td></tr>
    <tr><th>行为分型</th><td>${escape(dem.behaviorType)}</td></tr>
    <tr><th>结论</th><td>${escape(dem.summaryText)}</td></tr>
  </table>`;
  }

  private renderTvps4Section(
    tvps4: Record<string, unknown>,
    escape: (value: unknown) => string,
  ): string {
    if (Object.keys(tvps4).length === 0) {
      return '<h2>六、TVPS-4 子测验</h2><p>本次评估未录入 TVPS-4。</p>';
    }
    const scaled = this.asRecord(tvps4.scaledScores);
    return `<h2>六、TVPS-4 子测验</h2>
  <table>
    <tr><th>综合标准分</th><td>${escape(tvps4.overallStandardScore)}</td></tr>
    <tr><th>百分位</th><td>${escape(tvps4.overallPercentile)}</td></tr>
    ${Object.entries(scaled)
      .map(([key, value]) => `<tr><th>${escape(key)}</th><td>${escape(value)}</td></tr>`)
      .join('')}
  </table>`;
  }

  /**
   * 量表数据状态说明：遍历注册表 10 条，列出未进入本次记录的量表（TVMS-3 / RAN/RAS / SPSRC 等），
   * 让读者知道每个量表的题库与常模到底处于什么状态。
   */
  private renderScaleStatusSection(
    escape: (value: unknown) => string,
  ): string {
    const rows = Object.values(SCALE_PROVENANCE_REGISTRY)
      .map((item) => {
        const { label } = SCALE_DATA_STATUS_LABELS[item.dataStatus];
        return `<tr><td>${escape(item.nameCn)}</td><td><span class="status-badge ${
          DATA_STATUS_BADGE_CLASS[item.dataStatus]
        }">${escape(label)}</span></td><td>${escape(
          item.stimulusDataNature,
        )}</td></tr>`;
      })
      .join('');
    return `<h2>七、量表数据状态说明</h2>
  <table class="status-table">
    <thead>
      <tr><th>量表</th><th>数据状态</th><th>说明</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="footer">只有「${escape(SCALE_DATA_STATUS_LABELS.OFFICIAL_LICENSED.label)}」与「${escape(SCALE_DATA_STATUS_LABELS.MANUAL_ENTRY_ONLY.label)}」量表的标准分可作为正式结论；「${escape(SCALE_SCORE_SOURCE_LABELS.REFERENCE)}」仅供筛查参考，正式标准分以手册录入为准。</p>`;
  }
}
