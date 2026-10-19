import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

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
      beeryVmiStd: number | null;
      tvps4Std: number | null;
      mvpt3Std: number | null;
      demNormTier: string | null;
      radarScoresJson: string | null;
      createdAt: Date;
      student: { name: string; studentCode: string; schoolScene: string };
    },
    generatedAt: string,
  ): string {
    const radar = this.parseJson(record.radarScoresJson);
    const escape = (value: unknown): string =>
      String(value ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

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
    <tr><th>TVPS-4 标准分</th><td>${escape(record.tvps4Std)}</td></tr>
    <tr><th>MVPT-3 标准分</th><td>${escape(record.mvpt3Std)}</td></tr>
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

  <h2>四、训练处方建议</h2>
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
}
