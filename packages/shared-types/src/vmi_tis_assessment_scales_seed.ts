/**
 * 星眸智康 VMI-TIS — 孤独症学生视觉运动整合训练干预系统
 * 评估子系统全量量表题库、参数化SVG刺激生成引擎、临床视光常模与 L0–L5 自动定级算法种子字典
 * (V2.3.1 临床审计修正版 · 文献出处与数据状态标注；题卡数组按题号/结构收录，非官方图版；常模热覆盖未实现)
 *
 * 编制依据：《孤独症学生视觉运动整合训练干预系统整体设计方案（池霞团队方法体系）》第二章 & 第三章
 *
 * 工程存放路径建议：
 *   1. 主存放路径：`VMI-TIS/packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`
 *      并在 `VMI-TIS/packages/shared-types/src/index.ts` 中添加：
 *      `export * from './vmi_tis_assessment_scales_seed';`
 *   2. 数据库灌入路径：在 `apps/api/src/prisma/seed.ts` 中直接 import 本文件常量，一键写入 SQLite / PostgreSQL。
 *   3. 前端施测渲染：题号/指导语可从本文件读取；参数化 SVG 仅用于训练与演示，不作为官方施测题卡。
 */

// ============================================================================
// 一、 核心类型与枚举定义 (Shared Types & Enums)
// ============================================================================

export type VmiCapabilityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export type AssessmentTier =
  | 'TIER_1_SCREENING'   // 第一层：初筛问卷、0-6岁发育里程碑与眼科红区预警
  | 'TIER_2_OPTOMETRY'   // 第二层：视觉通路与视觉效率专科检查（调节/聚散/双眼视/NSUCO）
  | 'TIER_3_SCALES'      // 第三层：标准化功能评估量表（Beery VMI-6 / TVPS-4 / MVPT-4 / DEM / TVMS-3 / RAN / SPSRC）
  | 'TIER_4_PROCESS';    // 第四层：60Hz眼动仪客观指标与课堂10回合过程评估

/**
 * 标准量表枚举（已正式弃用旧版 MVPT_3，全面统一为 4岁–成人通用的 45 题 MVPT_4）
 */
export type ScaleCode =
  | 'BEERY_VMI_6'        // 视觉运动整合发育测验（第6版：主测验30题 + VP视觉感知补充30题 + MC运动协调补充30题）
  | 'TVPS_4'             // 视觉感知能力测试（第4版：7大无运动视觉感知子测验 × 18题 = 126题，深度剖析各子维度）
  | 'MVPT_4'             // 无运动视觉感知测验（第4版最新实物版：45题流线型4选1指认，4岁–成人通用，15分钟快速评估纯视觉感知）
  | 'DEM'                // 发育性眼动测验（≥6岁 Test A/B 纵向认读 + Test C 横向扫视 80数字矩阵）
  | 'NSUCO'              // 东北部州立大学视光学院眼动标准化观察量表（注视/追视/扫视 1-5分）
  | 'TVMS_3'             // 视觉运动技能测试（第3版：线条、角度、闭合与比例6维误差分析）
  | 'RAN_RAS'            // 快速自动命名与快速交替刺激测验（5×10 颜色/数字/物体/字母矩阵）
  | 'SPSRC_SIPT';        // 感觉处理与自我调节检核表 / 感觉统合与运用能力测验（L0底座筛查）

export type PerceptualDomainCode = 'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO';

/**
 * 1.1 全量表学术文献、官方手册出处与版权合规模式声明字典 (回应代码审查关于出处与性质的核验)
 * 说明：
 *   - 受国际出版商版权保护的商业量表（Beery VMI-6 / TVPS-4 / MVPT-4）默认只做「记分台」：
 *     ① 评估师使用医院采购的正版实物题册施测，软件按题号录入选项/得分；
 *     ② 内置参数化 SVG 仅用于训练与演示，不作为官方施测题卡；
 *     ③ 常模热插拔（CustomNormOverride）尚未实现；正式标准分以手册录入为准。
 *   - 每个量表的数据状态见 `SCALE_PROVENANCE_REGISTRY[].dataStatus`。
 */
export type ScaleDataStatus =
  | 'OFFICIAL_LICENSED'        // 有授权的官方题卡与官方常模表
  | 'MANUAL_ENTRY_ONLY'        // 只做记分台，正式标准分由手册录入
  | 'PROJECT_APPROXIMATION'    // 结构完整，数值为项目近似
  | 'STRUCTURE_ONLY';          // 只有题号/结构，无题目内容与常模

export type ProvenanceRegistryKey =
  | ScaleCode
  | 'TIER_1_SCREENING'
  | 'OPTOMETRY_NORMS';

export interface ScaleProvenanceMetadata {
  scaleCode: ProvenanceRegistryKey;
  nameCn: string;
  dataStatus: ScaleDataStatus;
  sourceNature: 'PROJECT_CLINICAL_CHECKLIST' | 'STANDARDIZED_PUBLISHED_SCALE' | 'OPTOMETRIC_CLINICAL_CRITERIA';
  schemeSectionRef: string;
  officialManualCitation: string;
  stimulusDataNature: string;
  normDataNature: string;
}

export const SCALE_PROVENANCE_REGISTRY: Record<ProvenanceRegistryKey, ScaleProvenanceMetadata> = {
  TIER_1_SCREENING: {
    scaleCode: 'TIER_1_SCREENING',
    nameCn: '入案第一层初筛三组（眼科红区预警 / 0–6岁视觉发育里程碑 / 日常视觉行为问卷）',
    dataStatus: 'PROJECT_APPROXIMATION',
    sourceNature: 'PROJECT_CLINICAL_CHECKLIST',
    schemeSectionRef: '《整体设计方案（池霞团队方法体系）》第二章 2.1–2.3 节、表1 & 表2',
    officialManualCitation: '南京市妇幼保健院池霞团队《孤独症学生视觉运动整合训练干预系统整体设计方案》临床分流共识，参考 AOA (American Optometric Association) Pediatric Eye Exam Guidelines',
    stimulusDataNature: '结构化临床症状与发育行为核查条目（按原方案表1、表2整理，未逐字核对）',
    normDataNature: '定性红绿区分流规则（触发任一红区项即执行规则 R1 熔断转介；里程碑按实足月龄区间比对）',
  },
  NSUCO: {
    scaleCode: 'NSUCO',
    nameCn: 'NSUCO 东北部州立大学视光学院眼动标准化观察量表',
    dataStatus: 'MANUAL_ENTRY_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.2.2 节 & 表3',
    officialManualCitation: 'Maples, W. C. (1995). NSUCO Oculomotor Test Manual. Santa Ana, CA: Optometric Extension Program Foundation (OEPF).',
    stimulusDataNature: '标准化逗引视标实物观察规程（平滑追踪2圈 + 扫视5周期，含 Ability/Accuracy/Head/Body 四因子 1–5 分评分细则）',
    normDataNature: '内置 Maples (1995) 5–14 岁分年龄/分性别最低达标分表（结构完整，数值待一手手册核对）',
  },
  OPTOMETRY_NORMS: {
    scaleCode: 'OPTOMETRY_NORMS',
    nameCn: '第二层视光专科检查临床判读标准（调节幅度/翻转拍灵活度/NPC集合近点）',
    dataStatus: 'PROJECT_APPROXIMATION',
    sourceNature: 'OPTOMETRIC_CLINICAL_CRITERIA',
    schemeSectionRef: '《整体设计方案》第三章 3.2.1 节',
    officialManualCitation: 'Hofstetter, H. W. (1950); Scheiman, M., & Wick, B. (2019). Clinical Management of Binocular Vision: Heterophoric, Accommodative, and Eye Movement Disorders (5th ed.). Wolters Kluwer.',
    stimulusDataNature: '眼科/视光专科器械检查指标（Age Duane 尺、±2.00D 双面镜翻转拍、Worth 四点、Randot 立体视）',
    normDataNature: 'Hofstetter 公开公式 (最小调节幅度 = 15 - 0.25×年龄) + Scheiman & Wick (2019) 学龄儿童临床截断值',
  },
  BEERY_VMI_6: {
    scaleCode: 'BEERY_VMI_6',
    nameCn: 'Beery-Buktenica 视觉运动整合发育测验（第6版：主测验30题 + VP感知补充30题 + MC运动协调30题）',
    dataStatus: 'MANUAL_ENTRY_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.3.1 节 & 表3',
    officialManualCitation: 'Beery, K. E., Buktenica, N. A., & Beery, N. A. (2010). The Beery-Buktenica Developmental Test of Visual-Motor Integration (6th ed., Beery VMI-6). Bloomington, MN: Pearson.',
    stimulusDataNature: '主测验 30 题结构 + 简化参数化 SVG；VP/MC 为由 VMI 题号派生的结构化索引，不是独立官方题卡',
    normDataNature: '内置 2–20 岁等效发展月龄与分龄标准分锚点表（项目近似）；正式标准分以手册录入为准',
  },
  TVPS_4: {
    scaleCode: 'TVPS_4',
    nameCn: '视觉感知能力测试（第4版，7大无运动视觉感知子测验 × 18题 = 126题）',
    dataStatus: 'MANUAL_ENTRY_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.4.1 节 & 表3',
    officialManualCitation: 'Martin, N. A. (2017). Test of Visual Perceptual Skills (4th ed., TVPS-4). Novato, CA: Academic Therapy Publications (ATP Assessments).',
    stimulusDataNature: '126 条题号索引 (TVPS_4_126_ITEMS，7×18)；题目内容未收录，电子题卡由参数化 SVG 生成，非官方题卡',
    normDataNature: '内置 5–18 岁项目近似查表矩阵 (TVPS_4_AGE_NORM_MATRIX)；正式量表分以手册录入为准',
  },
  MVPT_4: {
    scaleCode: 'MVPT_4',
    nameCn: '无运动视觉感知测验（第4版，空间视觉运动感知检查系统第四版，全表45题）',
    dataStatus: 'MANUAL_ENTRY_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.4.2 节升级版（配套医院采购 MVPT-4 实物检查箱）',
    officialManualCitation: 'Colarusso, R. P., & Hammill, D. D. (2015). Motor-Free Visual Perception Test-4 (MVPT-4). Novato, CA: Academic Therapy Publications (ATP Assessments).',
    stimulusDataNature: '45 条题号索引 (MVPT_4_45_ITEMS，5 维×9)；题目内容未收录，电子题卡由 9 个参数化基元生成，非官方图版',
    normDataNature: '内置 4–13 岁锚点表（项目近似）；14 岁以上只接受手册标准分',
  },
  DEM: {
    scaleCode: 'DEM',
    nameCn: '发育性眼动测验（Developmental Eye Movement Test，Test A/B 纵列80数字 + Test C 横向80数字）',
    dataStatus: 'MANUAL_ENTRY_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.2.2 节 & 表3',
    officialManualCitation: 'Garzia, R. P., Richman, J. E., Nicholson, S. B., & Letourneau, J. G. (1990). A new visual-verbal saccade test: the Developmental Eye Movement test (DEM). Journal of the American Optometric Association, 61(2), 124-135.',
    stimulusDataNature: '项目生成的 Test A/B/C 数字矩阵（40+40+80）；非官方图版',
    normDataNature: '内置 6–13 岁项目近似截断表（引 Garzia et al. 1990）；正式分型以手册为准',
  },
  TVMS_3: {
    scaleCode: 'TVMS_3',
    nameCn: '视觉运动技能测试（第3版，39幅几何图形精细动作失真度分析）',
    dataStatus: 'STRUCTURE_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.3.2 节 & 表3',
    officialManualCitation: 'Martin, N. A. (2010). Test of Visual-Motor Skills (3rd ed., TVMS-3). Novato, CA: Academic Therapy Publications.',
    stimulusDataNature: '6 类误差计分体系 + 39 条结构化索引（0/1/2 分制）；图形复用 VMI 基元，非官方题卡',
    normDataNature: '按总原始分（满分78分）与 6 类误差频次百分比输出精细运动控制短板剖面',
  },
  RAN_RAS: {
    scaleCode: 'RAN_RAS',
    nameCn: '快速自动命名与快速交替刺激测验（4个子测验 × 5行×10列 = 200项标准网格）',
    dataStatus: 'STRUCTURE_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.5.1 节 & 表3',
    officialManualCitation: 'Wolf, M., & Denckla, M. B. (2005). RAN/RAS: Rapid Automatized Naming and Rapid Alternating Stimulus Tests. Austin, TX: PRO-ED.',
    stimulusDataNature: '项目生成的 4 套 5×10 刺激矩阵 (grid5x10)；非官方卡片',
    normDataNature: '5–12 岁各年龄段 50 项认读超时截断秒数（单阈值表，无 Mean/SD）；正式常模以手册为准',
  },
  SPSRC_SIPT: {
    scaleCode: 'SPSRC_SIPT',
    nameCn: '感觉处理与自我调节检核表（SPSRC）及 L0 姿势底座临床核查表',
    dataStatus: 'STRUCTURE_ONLY',
    sourceNature: 'STANDARDIZED_PUBLISHED_SCALE',
    schemeSectionRef: '《整体设计方案》第三章 3.5.2 节 & 表3',
    officialManualCitation: 'Lai, C. Y. Y., Chung, J. C. C., Chan, C. C. H., & Li-Tsang, C. W. P. (2019). Sensory Processing and Self-Regulation Checklist (SPSRC). Hong Kong Polytechnic University.',
    stimulusDataNature: '6 项课堂 L0 实操核查 + 130 题的结构与子量表题数；题干未收录',
    normDataNature: 'L0 实操达标线（四点支撑 ≥5秒且坐姿稳定）+ SPSRC T分数/标准差截断（低于 -1SD 为感觉处理异常）',
  },
};

/**
 * 1.2 数据状态与分数来源标签（报告、前端徽标、科研 CSV 的唯一文案来源）
 * 说明：
 *   - `SCALE_DATA_STATUS_LABELS` 是 `ScaleDataStatus` 的展示文案，三处（HTML 报告 / 前端徽标 / CSV 列）
 *     只引用这里，禁止各自写一套中文。
 *   - `resolveScaleScoreSource` 是「这条量表分从哪来」的唯一判定入口：原始分自动换算标参考换算，
 *     手册录入标手册，未录入 / 有原始分但缺标准分标未录入。
 */
export type ScaleScoreSource =
  | 'MANUAL'          // 手册录入的正式标准分
  | 'REFERENCE'       // 内置参考锚点自动换算（以手册为准）
  | 'PROJECT_RULE'    // 项目判读规则（项目近似状态量表）
  | 'STRUCTURE_ONLY'  // 只有结构、没有可写入的分数
  | 'PENDING_REFERENCE' // 已录原始分，保存后走内置参考换算
  | 'NOT_ENTERED'     // 尚未录入
  | 'NEEDS_MANUAL';   // 已录原始分但缺标准分，需补手册标准分

export const SCALE_DATA_STATUS_LABELS: Record<
  ScaleDataStatus,
  { label: string; description: string }
> = {
  OFFICIAL_LICENSED: {
    label: '官方授权',
    description: '有授权的官方题卡与官方常模表',
  },
  MANUAL_ENTRY_ONLY: {
    label: '手册录入',
    description: '只做记分台，正式标准分由手册录入',
  },
  PROJECT_APPROXIMATION: {
    label: '项目近似',
    description: '结构完整，数值为项目近似',
  },
  STRUCTURE_ONLY: {
    label: '仅结构',
    description: '只有题号/结构，无题目内容与常模',
  },
};

export const SCALE_SCORE_SOURCE_LABELS: Record<ScaleScoreSource, string> = {
  MANUAL: '手册录入（正式）',
  REFERENCE: '内置参考换算（以手册为准）',
  PENDING_REFERENCE: '保存后换算为参考分',
  PROJECT_RULE: '项目判读规则',
  STRUCTURE_ONLY: '仅结构',
  NOT_ENTERED: '未录入',
  NEEDS_MANUAL: '未录入（需手册标准分）',
};

export interface ScaleScoreSourceInput {
  dataStatus: ScaleDataStatus;
  /** 已落库的分数；DEM 这类没有标准分的量传分型等非空值。null / undefined / 空串表示未录入。 */
  standardScore: number | string | null | undefined;
  /** true = 走了内置参考换算；false = 手册录入；null / undefined = 该量表没有这个字段（Beery / TVPS-4 / DEM）。 */
  normApplied?: boolean | null;
  /** 是否录入了原始分（原始分是换算的依据）。 */
  hasRawInput?: boolean;
}

/**
 * 判定一条量表分的来源。判定顺序按数据状态 → 有无分数 → 是否走了内置换算：
 * 仅结构 / 项目近似量表直接返回对应来源；没有分数时区分「未录入」与「有原始分待换算」；
 * 有分数时按 normApplied 三态区分手册与参考换算。
 */
export function resolveScaleScoreSource(
  input: ScaleScoreSourceInput
): ScaleScoreSource {
  if (input.dataStatus === 'STRUCTURE_ONLY') return 'STRUCTURE_ONLY';
  if (input.dataStatus === 'PROJECT_APPROXIMATION') return 'PROJECT_RULE';
  const hasScore =
    input.standardScore !== null &&
    input.standardScore !== undefined &&
    String(input.standardScore).trim() !== '';
  const hasRawInput = input.hasRawInput === true;
  if (!hasScore) return hasRawInput ? 'NEEDS_MANUAL' : 'NOT_ENTERED';
  if (input.normApplied === false) return 'MANUAL';
  if (input.normApplied === true) return 'REFERENCE';
  return hasRawInput ? 'REFERENCE' : 'MANUAL';
}

// ============================================================================
// 二、 第一层：入案初筛问卷、0–6岁发育里程碑核查表（原方案表2）与眼科红区熔断字典
// ============================================================================

export interface RedZoneTriageItem {
  code: string;
  category: 'ACUITY_REFRACTION' | 'STRABISMUS_DIPLOPIA' | 'AMBLYOPIA_ORGANIC';
  label: string;
  clinicalSign: string;
  referralDepartment: string;
  lockHighLoadVisualTraining: boolean;
}

/**
 * 2.1 眼科/视光红区预警指标（触发任一项即执行规则 R1：强制锁定常规训练并生成转介单）
 */
export const RED_ZONE_TRIAGE_ITEMS: RedZoneTriageItem[] = [
  {
    code: 'RED_01',
    category: 'ACUITY_REFRACTION',
    label: '裸眼视力显著低于同龄标准或怀疑中高度屈光不正/屈光参差',
    clinicalSign: '看远/看近持续眯眼、把书本或平板凑近至 <15cm、歪头斜眼视物',
    referralDepartment: '儿童眼保健科 / 医学验光配镜中心',
    lockHighLoadVisualTraining: true,
  },
  {
    code: 'RED_02',
    category: 'STRABISMUS_DIPLOPIA',
    label: '显斜视、间歇性斜视、看近诉重影（复视）或遮盖试验见眼球明显移动',
    clinicalSign: '单眼遮盖/交替遮盖试验（Cover Test）见眼位明显回正移动，或阅读10分钟内频繁揉眼诉双影',
    referralDepartment: '小儿眼科（斜弱视专科）',
    lockHighLoadVisualTraining: true,
  },
  {
    code: 'RED_03',
    category: 'AMBLYOPIA_ORGANIC',
    label: '弱视危险因素、自发性眼球震颤、瞳孔反常或伴随眼痛/头痛/眩晕呕吐',
    clinicalSign: '注视时眼球持续节律性摆动、畏光流泪、遮盖单眼时强烈哭闹抗拒（提示对侧眼弱视）',
    referralDepartment: '眼科专科门诊 / 神经眼科',
    lockHighLoadVisualTraining: true,
  },
];

export interface MilestoneChecklistItem {
  code: string;
  ageRangeLabel: string;
  minMonths: number;
  maxMonths: number;
  visualAndVmiMilestones: string[];
  redFlagWhenAbsent: string;
}

/**
 * 2.2 0–6岁视觉与视觉运动整合发育里程碑核查表（完整对应原方案第二章表2）
 */
export const MILESTONE_0_TO_6_CHECKLIST: MilestoneChecklistItem[] = [
  {
    code: 'MS_01',
    ageRangeLabel: '1–3 个月',
    minMonths: 1,
    maxMonths: 3,
    visualAndVmiMilestones: [
      '追视移动光源或人脸',
      '开始建立双眼共同注视',
      '头眼协调转动、可在身体中线位短暂注视双手',
    ],
    redFlagWhenAbsent: '满3个月仍无追视反应或双眼无法共同注视，需立即转介眼科排查器质性眼病',
  },
  {
    code: 'MS_02',
    ageRangeLabel: '4–6 个月',
    minMonths: 4,
    maxMonths: 6,
    visualAndVmiMilestones: [
      '注视目标并主动伸手抓握（眼手初步联结）',
      '可在 3 个及以上目标之间切换注视',
      '视觉追随掉落或滚开的玩具并尝试寻找丢失物件',
    ],
    redFlagWhenAbsent: '6个月仍不会看手或注视伸手抓物，提示早期眼手协调发育迟缓',
  },
  {
    code: 'MS_03',
    ageRangeLabel: '7–12 个月',
    minMonths: 7,
    maxMonths: 12,
    visualAndVmiMilestones: [
      '独坐稳定下持续注视细小物件（如小丸、葡萄干）并用拇食指捏取',
      '平滑追视从斜坡滚下的皮球',
      '主动注视绘本图片与熟悉人物面部表情',
    ],
    redFlagWhenAbsent: '坐位平衡不稳或无法注视细小物品，提示 L0 姿势底座与中心注视薄弱',
  },
  {
    code: 'MS_04',
    ageRangeLabel: '1–2 岁（12–24个月）',
    minMonths: 12,
    maxMonths: 24,
    visualAndVmiMilestones: [
      '手眼协调垂直叠搭 1–3 块方形积木',
      '完成 1–3 块嵌入式形状拼图板',
      '配对相同颜色与简单几何图形（圆、方）',
    ],
    redFlagWhenAbsent: '2岁仍无法叠2块积木或无法进行基础形状配对',
  },
  {
    code: 'MS_05',
    ageRangeLabel: '2.5–3.5 岁（30–42个月）',
    minMonths: 30,
    maxMonths: 42,
    visualAndVmiMilestones: [
      '模仿画出垂直线、水平线与闭合圆形',
      '准确指认或命名常见基本形状与颜色',
      '独立完成 6–10 块拼图及大孔径串珠',
    ],
    redFlagWhenAbsent: '3岁半仍停留在无规则涂鸦、无法仿画直线与圆，需启动 L2/L3 早期干预',
  },
  {
    code: 'MS_06',
    ageRangeLabel: '4–5 岁（48–60个月）',
    minMonths: 48,
    maxMonths: 60,
    visualAndVmiMilestones: [
      '独立临摹十字交叉线（+）、正方形、斜线与三角形',
      '画出包含头、眼、口、躯干的人脸或身体部位',
      '按形状与方向准确放入复杂形状板，辨认 ≥4 种颜色并沿粗线剪纸',
    ],
    redFlagWhenAbsent: '5岁无法临摹十字或正方形，跨中线整合困难',
  },
  {
    code: 'MS_07',
    ageRangeLabel: '5.5–6 岁（66–72个月）',
    minMonths: 66,
    maxMonths: 72,
    visualAndVmiMilestones: [
      '临摹开口方形与圆的相切组合图、三线交叉星形',
      '在田字格或限定区域内抄写少量简单汉字/数字/字母',
      '具备远近视线切换与初步课堂书写准备能力',
    ],
    redFlagWhenAbsent: '幼小衔接期抄写严重出格、跳行漏字，需系统评估 Beery VMI-6、MVPT-4 与 DEM',
  },
];

export interface BehaviorScreeningItem {
  code: string;
  domain: 'NEAR_WORK' | 'READING_WRITING' | 'SPACE_MOTOR' | 'FIGURE_GROUND';
  question: string;
  mappedShortfallLevel: VmiCapabilityLevel;
  recommendedSopCodes: string[];
}

/**
 * 2.3 日常视觉行为初筛问卷（教师/家长填写）
 */
export const BEHAVIOR_SCREENING_ITEMS: BehaviorScreeningItem[] = [
  {
    code: 'BHV_01',
    domain: 'NEAR_WORK',
    question: '近距离注视绘本或教具不足 2 分钟即移开视线，追随移动物体时必须大幅度转头代偿',
    mappedShortfallLevel: 'L1',
    recommendedSopCodes: ['操作卡 2-1', '操作卡 2-2', '操作卡 2-3'],
  },
  {
    code: 'BHV_02',
    domain: 'READING_WRITING',
    question: '朗读或抄写时频繁跳字、漏行、串行，必须依赖手指逐字点读才能维持位置',
    mappedShortfallLevel: 'L1',
    recommendedSopCodes: ['操作卡 2-2', '操作卡 3-1', '操作卡 5-1'],
  },
  {
    code: 'BHV_03',
    domain: 'FIGURE_GROUND',
    question: '在杂乱桌面找指定文具、在洗衣机混放衣物中找配对袜子或在复杂插图中找目标非常困难',
    mappedShortfallLevel: 'L2',
    recommendedSopCodes: ['操作卡 3-1', '操作卡 3-2'],
  },
  {
    code: 'BHV_04',
    domain: 'READING_WRITING',
    question: '写字经常跑出田字格边界、偏旁部首左右颠倒或间距极不均匀，临摹几何图形无法闭合',
    mappedShortfallLevel: 'L3',
    recommendedSopCodes: ['操作卡 3-3', '操作卡 4-1', '操作卡 4-3'],
  },
  {
    code: 'BHV_05',
    domain: 'SPACE_MOTOR',
    question: '坐姿难以维持端正（趴桌/歪斜）、上下楼梯容易踩空、抛接球或双侧手脚协同动作笨拙',
    mappedShortfallLevel: 'L0',
    recommendedSopCodes: ['操作卡 1-1', '操作卡 1-2', '操作卡 1-3'],
  },
];

// ============================================================================
// 三、 第二层：视光专科检查常模 & NSUCO 眼动标准化观察量表完整细则
// ============================================================================

export interface NsucoSubdimensionRubric {
  dimension: 'PURSUIT' | 'SACCADES';
  dimensionCn: string;
  testInstruction: string;
  scoringFactors: {
    ability: Record<1 | 2 | 3 | 4 | 5, string>;       // 完成圈数/次数能力
    accuracy: Record<1 | 2 | 3 | 4 | 5, string>;      // 追视平稳度/落点准确性
    headMovement: Record<1 | 2 | 3 | 4 | 5, string>;  // 头部代偿控制（越不转头分越高）
    bodyMovement: Record<1 | 2 | 3 | 4 | 5, string>;  // 身体摇晃代偿控制
  };
}

/**
 * 3.1 NSUCO 东北部州立大学视光学院眼动测验完整评分量表（原方案 3.2.2 节）
 */
export const NSUCO_STANDARD_SCALE: NsucoSubdimensionRubric[] = [
  {
    dimension: 'PURSUIT',
    dimensionCn: '平滑追踪（Pursuit Test）',
    testInstruction: '被测学生自然站立，检查者手持逗引视标在距受检者鼻根 40cm、直径不超过 20cm 的圆周上顺时针转 2 圈、逆时针转 2 圈。要求“头保持不动，只用眼睛跟着小球转”。',
    scoringFactors: {
      ability: {
        1: '不能完成半圈追视',
        2: '每个方向仅完成半圈（0.5圈）',
        3: '每个方向完成 1 圈',
        4: '每个方向完成 1.5 圈',
        5: '顺时针与逆时针均完整完成 2 圈',
      },
      accuracy: {
        1: '全程无法跟上视标，出现 >10 次修正性微眼跳（Refixations）',
        2: '追视极不平滑，出现 5–10 次修正性眼跳或注视中断',
        3: '出现 3–4 次修正性眼跳',
        4: '追视基本平滑，修正性眼跳 ≤ 2 次',
        5: '全程平滑追随，无明显修正性眼跳或脱靶',
      },
      headMovement: {
        1: '全程大幅度转头跟随视标移动',
        2: '中度至大幅度转头代偿（超过一半时间转头）',
        3: '轻度至中度转头代偿（部分象限出现转头）',
        4: '仅有极轻微的瞬间头部微动',
        5: '头部完全保持静止，实现 100% 眼-头分离',
      },
      bodyMovement: {
        1: '躯干大幅度扭动或移步',
        2: '躯干间断性晃动',
        3: '肩部或躯干轻微晃动',
        4: '偶有极轻微身体紧张移动',
        5: '身体安静稳定，无任何伴随动作',
      },
    },
  },
  {
    dimension: 'SACCADES',
    dimensionCn: '扫视测验（Saccades Test）',
    testInstruction: '受检者站立，检查者双手各持红、绿视标置于受检者前方 40cm、两视标间距 20cm（各偏离中线10cm）。交替喊“看红球—看绿球”共往返 5 个周期（10次扫视）。',
    scoringFactors: {
      ability: {
        1: '完成少于 2 个往返周期',
        2: '完成 2 个往返周期',
        3: '完成 3 个往返周期',
        4: '完成 4 个往返周期',
        5: '完整完成全部 5 个往返周期（10次扫视）',
      },
      accuracy: {
        1: '严重过冲（Overshoot）或欠冲（Undershoot），需多次修正才能落到目标上',
        2: '中度至重度落点偏差，超过 4 次以上明显修正',
        3: '轻度落点偏差，存在 2–3 次微调修正',
        4: '仅偶发 1 次轻微过冲/欠冲',
        5: '每次扫视均一步精准落位，无过冲或欠冲',
      },
      headMovement: {
        1: '每次切换目标均完全靠转头完成',
        2: '超过一半次数伴随明显转头',
        3: '3–4 次扫视伴随轻微转头',
        4: '仅 1–2 次瞬间轻微头动',
        5: '头部完全静止，纯靠眼球快速跳动切换焦点',
      },
      bodyMovement: {
        1: '全身隨口令左右晃动',
        2: '躯干明显伴随移动',
        3: '肩部轻微耸动或前倾',
        4: '偶有极轻微肢体紧张',
        5: '身体完全稳定',
      },
    },
  },
];

/**
 * 3.1.2 NSUCO 官方分年龄、分性别最低达标常模表（出处：Maples WC, 1995 NSUCO Oculomotor Test Manual, OEPF）
 * 临床判读规则：若受检儿童在对应年龄/性别下的任一因子得分低于下表最低达标分，即判定为该眼动维度发育落后（定级优先归入 L1 视觉效率阶段）。
 */
export interface NsucoAgeNormRow {
  ageYears: number; // 5 ~ 14 (14代表14岁及以上)
  pursuitMinAcceptable: {
    boys: { ability: number; accuracy: number; headMovement: number; bodyMovement: number };
    girls: { ability: number; accuracy: number; headMovement: number; bodyMovement: number };
  };
  saccadesMinAcceptable: {
    boys: { ability: number; accuracy: number; headMovement: number; bodyMovement: number };
    girls: { ability: number; accuracy: number; headMovement: number; bodyMovement: number };
  };
}

export const NSUCO_AGE_NORMS_TABLE: NsucoAgeNormRow[] = [
  {
    ageYears: 5,
    pursuitMinAcceptable: { boys: { ability: 4, accuracy: 2, headMovement: 2, bodyMovement: 3 }, girls: { ability: 5, accuracy: 3, headMovement: 2, bodyMovement: 4 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 2, headMovement: 2, bodyMovement: 3 }, girls: { ability: 5, accuracy: 3, headMovement: 2, bodyMovement: 4 } },
  },
  {
    ageYears: 6,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 3, headMovement: 2, bodyMovement: 4 }, girls: { ability: 5, accuracy: 3, headMovement: 3, bodyMovement: 4 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 3, headMovement: 2, bodyMovement: 4 }, girls: { ability: 5, accuracy: 3, headMovement: 2, bodyMovement: 4 } },
  },
  {
    ageYears: 7,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 3, headMovement: 3, bodyMovement: 4 }, girls: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 4 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 3, headMovement: 3, bodyMovement: 4 }, girls: { ability: 5, accuracy: 3, headMovement: 3, bodyMovement: 4 } },
  },
  {
    ageYears: 8,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 4 }, girls: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 3, headMovement: 3, bodyMovement: 4 }, girls: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 5 } },
  },
  {
    ageYears: 9,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 3, bodyMovement: 5 } },
  },
  {
    ageYears: 10,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 } },
  },
  {
    ageYears: 11,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 } },
  },
  {
    ageYears: 12,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 4, headMovement: 4, bodyMovement: 5 } },
  },
  {
    ageYears: 13,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 5, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 } },
  },
  {
    ageYears: 14,
    pursuitMinAcceptable: { boys: { ability: 5, accuracy: 5, headMovement: 5, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 5, bodyMovement: 5 } },
    saccadesMinAcceptable: { boys: { ability: 5, accuracy: 5, headMovement: 4, bodyMovement: 5 }, girls: { ability: 5, accuracy: 5, headMovement: 5, bodyMovement: 5 } },
  },
];

export const OPTOMETRY_NORMS = {
  /** Hofstetter 最小预期调节幅度公式：15 - 0.25 × 年龄（平均公式：18.5 - 0.3 × 年龄） */
  minExpectedAccomAmplitudeD: (ageYears: number): number =>
    Number((15.0 - 0.25 * ageYears).toFixed(2)),
  /** 集合近点 (NPC) 临床判定阈值：≤ 6cm 正常，7~10cm 临界，> 10cm 集合不足 */
  npcCutoffCm: {
    normalMax: 6.5,
    borderlineMax: 10.0,
    insufficiencyThreshold: 10.0,
  },
  /** ±2.00D 双面镜双眼调节灵活度学龄儿童常模：≥ 8 cpm 正常，< 6 cpm 显著调节滞后/不足 */
  accomFacilityCpmCutoff: {
    normalMin: 8,
    lagThreshold: 6,
  },
};

// ============================================================================
// 四、 第三层量表 1：Beery VMI-6（主测验30题 + VP补充测验 + MC补充测验 + 分龄常模矩阵）
// ============================================================================

export interface BeeryVmiItemSpec {
  itemNumber: number;              // 题号 1 ~ 30（前 21 题构成短表 Short Form，全表 30 题）
  titleCn: string;                 // 几何图形中文名称
  titleEn: string;                 // 英文标准名称
  developmentalAgeMonths: number;  // 常模等效发展月龄（如 69 个月 = 5岁9个月）
  developmentalAgeLabel: string;   // 显示标签（如 "5岁9个月"）
  isShortFormIncluded: boolean;    // 是否包含在 2–7 岁短表（前21题）中
  stimulusSvgType: string;         // 双屏施测前端 SVG 范图渲染标识
  svgRenderPaths: string[];        // 可直接在 160×160 viewBox 中渲染的参数化矢量路径
  scoringCriteriaPass: string;     // 计 1 分（通过）手册刚性标准
  scoringCriteriaFail: string;     // 计 0 分（未通过）典型失误特征
}

export const BEERY_VMI_6_ITEMS: BeeryVmiItemSpec[] = [
  {
    itemNumber: 1,
    titleCn: '垂直线模仿（治疗师示范后画竖线）',
    titleEn: 'Imitated Vertical Line',
    developmentalAgeMonths: 24,
    developmentalAgeLabel: '2岁0个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_VERTICAL_IMITATE',
    svgRenderPaths: ['M 80 25 L 80 135'],
    scoringCriteriaPass: '主要由上往下或由下往上的单根线条，偏离垂直轴不超过 30°，长度 ≥ 1.5cm',
    scoringCriteriaFail: '纯圆圈涂鸦、水平横线或散点敲击',
  },
  {
    itemNumber: 2,
    titleCn: '水平线模仿（治疗师示范后画横线）',
    titleEn: 'Imitated Horizontal Line',
    developmentalAgeMonths: 26,
    developmentalAgeLabel: '2岁2个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_HORIZONTAL_IMITATE',
    svgRenderPaths: ['M 25 80 L 135 80'],
    scoringCriteriaPass: '主体为横向延伸线条，偏离水平轴不超过 30°',
    scoringCriteriaFail: '竖线、环形涂鸦或斜率超过 45°',
  },
  {
    itemNumber: 3,
    titleCn: '圆形模仿（治疗师示范后画圆）',
    titleEn: 'Imitated Circle',
    developmentalAgeMonths: 28,
    developmentalAgeLabel: '2岁4个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'CIRCLE_IMITATE',
    svgRenderPaths: ['M 80 30 A 50 50 0 1 0 79.9 30 Z'],
    scoringCriteriaPass: '单圈或不超过 1.5 圈的弧形闭合图形，长短轴比例不超过 2:1',
    scoringCriteriaFail: '反复螺旋绕圈超过 2 圈、直线条或完全开放的折线',
  },
  {
    itemNumber: 4,
    titleCn: '垂直线临摹（直接看题卡画竖线）',
    titleEn: 'Copied Vertical Line',
    developmentalAgeMonths: 30,
    developmentalAgeLabel: '2岁6个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_VERTICAL_COPY',
    svgRenderPaths: ['M 80 25 L 80 135'],
    scoringCriteriaPass: '无需示范，独立看范图画出偏离垂直轴 ≤ 20° 的直线，无明显折角',
    scoringCriteriaFail: '需成人手把手示范才能动笔，或偏斜 > 20°',
  },
  {
    itemNumber: 5,
    titleCn: '水平线临摹（直接看题卡画横线）',
    titleEn: 'Copied Horizontal Line',
    developmentalAgeMonths: 32,
    developmentalAgeLabel: '2岁8个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_HORIZONTAL_COPY',
    svgRenderPaths: ['M 25 80 L 135 80'],
    scoringCriteriaPass: '独立看范图画出偏离水平轴 ≤ 20° 的横线',
    scoringCriteriaFail: '线条弯曲成弧形或偏离水平 > 20°',
  },
  {
    itemNumber: 6,
    titleCn: '圆形临摹（直接看题卡画圆）',
    titleEn: 'Copied Circle',
    developmentalAgeMonths: 35,
    developmentalAgeLabel: '2岁11个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'CIRCLE_COPY',
    svgRenderPaths: ['M 80 30 A 50 50 0 1 0 79.9 30 Z'],
    scoringCriteriaPass: '独立画出基本圆润的闭合圆形，闭合缺口 ≤ 4mm 且无明显尖角',
    scoringCriteriaFail: '出现明显直角/锐角，或闭合缺口过大呈 C 形',
  },
  {
    itemNumber: 7,
    titleCn: '十字交叉线临摹（垂直与水平正交）',
    titleEn: 'Vertical-Horizontal Cross',
    developmentalAgeMonths: 40,
    developmentalAgeLabel: '3岁4个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'CROSS_ORTHOGONAL',
    svgRenderPaths: ['M 80 25 L 80 135', 'M 25 80 L 135 80'],
    scoringCriteriaPass: '两根独立直线相交，交角在 70°~110° 之间，交点两侧线段长度比不超过 2:1',
    scoringCriteriaFail: '用 4 根短线拼接、两线未相交分离或呈 X 形斜交',
  },
  {
    itemNumber: 8,
    titleCn: '右斜线临摹（右上至左下 /）',
    titleEn: 'Right Oblique Line',
    developmentalAgeMonths: 46,
    developmentalAgeLabel: '3岁10个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_OBLIQUE_RIGHT',
    svgRenderPaths: ['M 125 30 L 35 130'],
    scoringCriteriaPass: '单根连续直线，倾斜角介于 25°~65° 之间，方向正确',
    scoringCriteriaFail: '画成竖线/横线、左右方向反置（\\）或中途明显折弯',
  },
  {
    itemNumber: 9,
    titleCn: '正方形临摹',
    titleEn: 'Square',
    developmentalAgeMonths: 50,
    developmentalAgeLabel: '4岁2个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'SQUARE',
    svgRenderPaths: ['M 35 35 L 125 35 L 125 125 L 35 125 Z'],
    scoringCriteriaPass: '四个角均为明确近直角（75°~105°），四边基本平直，邻边长度比 ≤ 1.5:1',
    scoringCriteriaFail: '任意一角画成圆弧（成圆角矩形/圆形）或呈明显梯形/长条形',
  },
  {
    itemNumber: 10,
    titleCn: '左斜线临摹（左上至右下 \\）',
    titleEn: 'Left Oblique Line',
    developmentalAgeMonths: 53,
    developmentalAgeLabel: '4岁5个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'LINE_OBLIQUE_LEFT',
    svgRenderPaths: ['M 35 30 L 125 130'],
    scoringCriteriaPass: '左上至右下连续斜线，倾斜角介于 115°~155° 之间',
    scoringCriteriaFail: '方向反置或画成垂直/水平线',
  },
  {
    itemNumber: 11,
    titleCn: '斜交叉线临摹（X 形交叉）',
    titleEn: 'Oblique Cross (X)',
    developmentalAgeMonths: 57,
    developmentalAgeLabel: '4岁9个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'CROSS_OBLIQUE_X',
    svgRenderPaths: ['M 35 35 L 125 125', 'M 125 35 L 35 125'],
    scoringCriteriaPass: '两根斜线在中部相交，两条线均显著偏离水平与垂直轴（跨中线斜交）',
    scoringCriteriaFail: '其中一根线变成竖线或横线（退化为正十字 +），或用两个 V 对接',
  },
  {
    itemNumber: 12,
    titleCn: '三角形临摹',
    titleEn: 'Triangle',
    developmentalAgeMonths: 63,
    developmentalAgeLabel: '5岁3个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'TRIANGLE',
    svgRenderPaths: ['M 80 28 L 132 126 L 28 126 Z'],
    scoringCriteriaPass: '由三根直边与三个明确尖角围成闭合图形，底边基本水平，顶角无圆弧化',
    scoringCriteriaFail: '出现第 4 条边、顶角画成圆顶或底边严重倾斜 > 20°',
  },
  {
    itemNumber: 13,
    titleCn: '开口正方形与圆形相接（相切组合图）',
    titleEn: 'Open Square and Circle',
    developmentalAgeMonths: 66,
    developmentalAgeLabel: '5岁6个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'OPEN_SQUARE_AND_CIRCLE',
    svgRenderPaths: ['M 25 45 L 75 45 L 75 115 L 25 115', 'M 105 80 A 30 30 0 1 0 104.9 80 Z'],
    scoringCriteriaPass: '三边开口方形与圆形空间朝向正确，两者接触或间距 ≤ 3mm 且未大幅穿透',
    scoringCriteriaFail: '开口方向错误、两图形相距过远或完全重叠包含',
  },
  {
    itemNumber: 14,
    titleCn: '圆与正方形重叠交集 / 三线米字星',
    titleEn: 'Three-Line Cross / Overlapping Circle-Square',
    developmentalAgeMonths: 69,
    developmentalAgeLabel: '5岁9个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'CIRCLE_SQUARE_OVERLAP',
    svgRenderPaths: ['M 65 38 A 42 42 0 1 0 64.9 38 Z', 'M 65 42 L 133 42 L 133 110 L 65 110 Z'],
    scoringCriteriaPass: '两图形存在清晰重叠交集区域（或三线交于同一中心点），四角保持直角且闭合良好',
    scoringCriteriaFail: '两图形分离不相交、完全内含或角度严重变形',
  },
  {
    itemNumber: 15,
    titleCn: '方向箭头十字（四角带V形尖端十字）',
    titleEn: 'Directional Arrows Cross',
    developmentalAgeMonths: 73,
    developmentalAgeLabel: '6岁1个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'DIRECTIONAL_CROSS_ARROWS',
    svgRenderPaths: ['M 80 25 L 80 135', 'M 25 80 L 135 80', 'M 70 38 L 80 25 L 90 38', 'M 70 122 L 80 135 L 90 122'],
    scoringCriteriaPass: '正交主干垂直水平端正，末端箭头对称且角度一致',
    scoringCriteriaFail: '漏画箭头、箭头方向内翻或主干歪斜',
  },
  {
    itemNumber: 16,
    titleCn: '正立菱形（四边等长对角对称）',
    titleEn: 'Vertical Diamond',
    developmentalAgeMonths: 81,
    developmentalAgeLabel: '6岁9个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'DIAMOND_VERTICAL',
    svgRenderPaths: ['M 80 22 L 128 80 L 80 138 L 32 80 Z'],
    scoringCriteriaPass: '四根斜边平直，上下两个顶角相对垂直，左右两个侧角相对水平，无风筝形严重失衡',
    scoringCriteriaFail: '画成旋转正方形（带水平底边）、耳朵状凸起或上下严重不对称',
  },
  {
    itemNumber: 17,
    titleCn: '双三角形内嵌（倒三角嵌于正三角内）',
    titleEn: 'Triangle Within a Triangle',
    developmentalAgeMonths: 86,
    developmentalAgeLabel: '7岁2个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'NESTED_TRIANGLES',
    svgRenderPaths: ['M 80 24 L 134 128 L 26 128 Z', 'M 53 76 L 107 76 L 80 128 Z'],
    scoringCriteriaPass: '外正三角与内倒三角顶点准确触及外三角三边中点附近（误差 ≤ 4mm）',
    scoringCriteriaFail: '内三角未倒置、顶点悬空远离外边框或穿出外边框',
  },
  {
    itemNumber: 18,
    titleCn: '八点环形圆点阵（按比例与间距排布8个圆点）',
    titleEn: 'Circle of Eight Dots',
    developmentalAgeMonths: 91,
    developmentalAgeLabel: '7岁7个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'EIGHT_DOTS_CIRCLE',
    svgRenderPaths: ['M 80 30 A 3 3 0 1 0 79.9 30', 'M 115 45 A 3 3 0 1 0 114.9 45', 'M 130 80 A 3 3 0 1 0 129.9 80', 'M 115 115 A 3 3 0 1 0 114.9 115', 'M 80 130 A 3 3 0 1 0 79.9 130', 'M 45 115 A 3 3 0 1 0 44.9 115', 'M 30 80 A 3 3 0 1 0 29.9 80', 'M 45 45 A 3 3 0 1 0 44.9 45'],
    scoringCriteriaPass: '点数量准确为 8 个，整体围成正圆形轮廓且间距均匀（上下左右对称）',
    scoringCriteriaFail: '点数多于或少于 8 个、画成实心涂黑球或排列成方形/乱序',
  },
  {
    itemNumber: 19,
    titleCn: '威特海默双五边形相接（倾斜五边形组合）',
    titleEn: 'Wertheimer Hexagons / Intersecting Pentagons',
    developmentalAgeMonths: 97,
    developmentalAgeLabel: '8岁1个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'WERTHEIMER_PENTAGONS',
    svgRenderPaths: ['M 25 60 L 55 35 L 82 60 L 70 115 L 35 115 Z', 'M 82 60 L 110 35 L 138 60 L 125 115 L 90 115 Z'],
    scoringCriteriaPass: '左右两多边形边数与倾斜角度正确，相接顶点准确重合',
    scoringCriteriaFail: '少边退化为两个方形或两图形分离',
  },
  {
    itemNumber: 20,
    titleCn: '水平卧式菱形（长轴水平）',
    titleEn: 'Horizontal Diamond',
    developmentalAgeMonths: 103,
    developmentalAgeLabel: '8岁7个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'DIAMOND_HORIZONTAL',
    svgRenderPaths: ['M 20 80 L 80 36 L 140 80 L 80 124 Z'],
    scoringCriteriaPass: '水平对角线明显长于垂直对角线，四角成对对称且四边平直',
    scoringCriteriaFail: '长短轴比例颠倒（画成竖菱形）或角度圆钝',
  },
  {
    itemNumber: 21,
    titleCn: '三圆环奥林匹克交叠（三圆两两相交）',
    titleEn: 'Three Overlapping Circles',
    developmentalAgeMonths: 110,
    developmentalAgeLabel: '9岁2个月',
    isShortFormIncluded: true,
    stimulusSvgType: 'THREE_OVERLAPPING_CIRCLES',
    svgRenderPaths: ['M 65 65 A 32 32 0 1 0 64.9 65 Z', 'M 95 65 A 32 32 0 1 0 94.9 65 Z', 'M 80 92 A 32 32 0 1 0 79.9 92 Z'],
    scoringCriteriaPass: '三个大小相近的圆呈品字形两两相交，中心形成明确三叶交集区',
    scoringCriteriaFail: '三圆仅外切未相交、排成一直线或大小悬殊超过 2:1',
  },
  {
    itemNumber: 22,
    titleCn: '内克尔立方体（三维透视正方体）',
    titleEn: 'Necker Cube',
    developmentalAgeMonths: 118,
    developmentalAgeLabel: '9岁10个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'NECKER_CUBE_3D',
    svgRenderPaths: ['M 30 55 L 95 55 L 95 120 L 30 120 Z', 'M 60 30 L 125 30 L 125 95 L 60 95 Z', 'M 30 55 L 60 30', 'M 95 55 L 125 30', 'M 95 120 L 125 95', 'M 30 120 L 60 95'],
    scoringCriteriaPass: '前后两个正方形面平行且通过 4 根平行斜棱准确连接对应顶点，呈现完整立体透视感',
    scoringCriteriaFail: '棱线连错顶点、退化为平面网格或少画透视棱线',
  },
  {
    itemNumber: 23,
    titleCn: '双层回字形立体框（斜切嵌套矩形框）',
    titleEn: 'Tapered Box / Nested Frame',
    developmentalAgeMonths: 126,
    developmentalAgeLabel: '10岁6个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'TAPERED_NESTED_BOX',
    svgRenderPaths: ['M 25 25 L 135 25 L 135 135 L 25 135 Z', 'M 52 52 L 108 52 L 108 108 L 52 108 Z', 'M 25 25 L 52 52', 'M 135 25 L 108 52', 'M 135 135 L 108 108', 'M 25 135 L 52 108'],
    scoringCriteriaPass: '内外矩形比例协调，四角4根斜向连线准确汇入内框四角且不穿透',
    scoringCriteriaFail: '角连线未对齐顶点或内外框偏斜',
  },
  {
    itemNumber: 24,
    titleCn: '三维折叠十字星（立体交叉带）',
    titleEn: '3D Overlapping Cross',
    developmentalAgeMonths: 134,
    developmentalAgeLabel: '11岁2个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'CROSS_3D_RIBBON',
    svgRenderPaths: ['M 65 25 L 95 25 L 95 135 L 65 135 Z', 'M 25 65 L 65 65', 'M 95 65 L 135 65 L 135 95 L 95 95', 'M 65 95 L 25 95 Z'],
    scoringCriteriaPass: '准确表现前后遮挡断线关系与平行带宽，全部外角闭合',
    scoringCriteriaFail: '遮挡处画成穿透实线或比例严重失调',
  },
  {
    itemNumber: 25,
    titleCn: '双菱形对角镶嵌星形',
    titleEn: 'Double Diamond Star',
    developmentalAgeMonths: 142,
    developmentalAgeLabel: '11岁10个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'DOUBLE_DIAMOND_STAR',
    svgRenderPaths: ['M 80 20 L 115 80 L 80 140 L 45 80 Z', 'M 20 80 L 80 45 L 140 80 L 80 115 Z'],
    scoringCriteriaPass: '八角对称度良好，对角轴线对齐',
    scoringCriteriaFail: '分瓣歪斜或边数错误',
  },
  {
    itemNumber: 26,
    titleCn: '三维圆柱与透视截面组合',
    titleEn: '3D Cylinder Perspective',
    developmentalAgeMonths: 152,
    developmentalAgeLabel: '12岁8个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'CYLINDER_3D',
    svgRenderPaths: ['M 40 45 A 40 15 0 1 0 120 45 A 40 15 0 1 0 40 45', 'M 40 45 L 40 120 A 40 15 0 0 0 120 120 L 120 45'],
    scoringCriteriaPass: '椭圆端面曲率对称，两侧母线平行等长',
    scoringCriteriaFail: '椭圆变成尖角或两侧母线不平行',
  },
  {
    itemNumber: 27,
    titleCn: '三环交织莫比乌斯链（奇偶遮挡环）',
    titleEn: 'Interlocking Rings',
    developmentalAgeMonths: 162,
    developmentalAgeLabel: '13岁6个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'INTERLOCKING_RINGS_3D',
    svgRenderPaths: ['M 60 60 A 28 28 0 1 0 59.9 60', 'M 100 60 A 28 28 0 1 0 99.9 60', 'M 80 95 A 28 28 0 1 0 79.9 95'],
    scoringCriteriaPass: '双线环带宽度均匀，上下交错遮挡关系准确',
    scoringCriteriaFail: '单线画环或遮挡关系混乱',
  },
  {
    itemNumber: 28,
    titleCn: '三维六棱柱晶体（多面体透视）',
    titleEn: '3D Hexagonal Prism',
    developmentalAgeMonths: 174,
    developmentalAgeLabel: '14岁6个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'HEXAGONAL_PRISM_3D',
    svgRenderPaths: ['M 55 25 L 105 25 L 125 45 L 105 65 L 55 65 L 35 45 Z', 'M 35 45 L 35 115 L 55 135 L 105 135 L 125 115 L 125 45'],
    scoringCriteriaPass: '顶底六边形平行对应，垂直侧棱等距平行',
    scoringCriteriaFail: '多边形边数缺失或透视坍塌',
  },
  {
    itemNumber: 29,
    titleCn: '复杂嵌入式多边形星阵',
    titleEn: 'Complex Embedded Star Polygon',
    developmentalAgeMonths: 186,
    developmentalAgeLabel: '15岁6个月',
    isShortFormIncluded: false,
    stimulusSvgType: 'EMBEDDED_STAR_POLYGON',
    svgRenderPaths: ['M 80 20 L 132 50 L 132 110 L 80 140 L 28 110 L 28 50 Z', 'M 80 20 L 132 110 L 28 110 Z', 'M 28 50 L 132 50 L 80 140 Z'],
    scoringCriteriaPass: '内外几何顶点严密咬合，中心对称度误差 ≤ 3mm',
    scoringCriteriaFail: '顶点错位或线条出界',
  },
  {
    itemNumber: 30,
    titleCn: '多维透视悬浮立方体组合（全表最高阶题项）',
    titleEn: 'Complex 3D Perspective Cubes',
    developmentalAgeMonths: 204,
    developmentalAgeLabel: '17岁0个月+',
    isShortFormIncluded: false,
    stimulusSvgType: 'COMPLEX_PERSPECTIVE_CUBES',
    svgRenderPaths: ['M 80 20 L 130 45 L 130 105 L 80 130 L 30 105 L 30 45 Z', 'M 80 20 L 80 80 L 130 105', 'M 80 80 L 30 105'],
    scoringCriteriaPass: '消失点透视一致，所有三维面闭合且比例精准',
    scoringCriteriaFail: '透视平行线发散或结构错误',
  },
];

/**
 * 4.2 Beery VMI-6 两个独立补充测验（VP 视觉感知补充测验 + MC 运动协调补充测验）说明与题项结构
 */
export const BEERY_SUPPLEMENTARY_TESTS = {
  VP_VISUAL_PERCEPTION: {
    code: 'BEERY_VP',
    nameCn: 'Beery 视觉感知补充测验（纯指认·排除运动干扰）',
    totalItems: 30,
    timeLimitSec: 180, // 3分钟限时或连续3题错误中止
    instruction: '向学生展示上方1个标准几何图形，请学生在不画图的情况下，从下方选项中用手指指出“哪一个图形和上面一模一样”。',
    clinicalRole: '若 Beery VMI 主测验低分 (<80)，但 VP 补充测验正常 (≥90)，说明孩子“看得准，但手画不准或眼手配合差”。',
  },
  MC_MOTOR_COORDINATION: {
    code: 'BEERY_MC',
    nameCn: 'Beery 运动协调补充测验（双线通道内描线·排除复杂视觉分析）',
    totalItems: 30,
    timeLimitSec: 300, // 5分钟限时
    instruction: '图形已有灰色双线通道边界与圆点提示，请学生用触控笔/铅笔在通道内部把黑点连起来，线条不能超出双线边界。',
    clinicalRole: '若 MC 补充测验同样显著低于常模 (<80)，确诊为手部精细运动控制薄弱（需重点匹配 L3 镊子夹珠、串珠与描线）。',
  },
};

export interface BeeryVpItemSpec {
  itemNumber: number; // 1 ~ 30
  linkedVmiItemNumber: number;
  titleCn: string;
  targetSvgPaths: string[];
  correctOptionIndex: 0 | 1 | 2 | 3;
  scoringRule: string;
}

/**
 * 4.2.1 Beery VP 视觉感知补充测验 30 条结构化索引（由 VMI 30 题派生，非独立官方题卡；实物施测以题册答案为准）
 */
export const BEERY_VP_30_ITEMS: BeeryVpItemSpec[] = BEERY_VMI_6_ITEMS.map((vmiItem) => ({
  itemNumber: vmiItem.itemNumber,
  linkedVmiItemNumber: vmiItem.itemNumber,
  titleCn: `VP视觉感知 #${vmiItem.itemNumber}：${vmiItem.titleCn.replace(/模仿|临摹/g, '同形指认')}`,
  targetSvgPaths: vmiItem.svgRenderPaths,
  correctOptionIndex: ((vmiItem.itemNumber * 3 + 1) % 4) as 0 | 1 | 2 | 3,
  scoringRule: '不要求动笔，学生在下方选项中准确指认出与上方范图完全一致的图形计 1 分，指认错误计 0 分（连续3题0分或满3分钟中止）。',
}));

export interface BeeryMcItemSpec {
  itemNumber: number; // 1 ~ 30
  linkedVmiItemNumber: number;
  titleCn: string;
  centerTrackSvgPaths: string[];
  channelWidthPx: number; // 双线通道宽度（随题号由 16px 递减至 6px，考察运笔精细控制）
  scoringRulePass: string;
  scoringRuleFail: string;
}

/**
 * 4.2.2 Beery MC 运动协调补充测验 30 条双线描线结构化索引（由 VMI 30 题派生，非独立官方题卡）
 */
export const BEERY_MC_30_ITEMS: BeeryMcItemSpec[] = BEERY_VMI_6_ITEMS.map((vmiItem) => ({
  itemNumber: vmiItem.itemNumber,
  linkedVmiItemNumber: vmiItem.itemNumber,
  titleCn: `MC运动协调 #${vmiItem.itemNumber}：${vmiItem.titleCn.replace(/模仿|临摹/g, '双线通道内描线')}`,
  centerTrackSvgPaths: vmiItem.svgRenderPaths,
  channelWidthPx: Math.max(6, 16 - Math.floor(vmiItem.itemNumber / 3)),
  scoringRulePass: '触控笔/铅笔轨迹全程保持在灰色双线通道内部连接所有提示黑点，未触碰或穿出外边界线计 1 分。',
  scoringRuleFail: '笔画穿出双线通道外边界 >1mm、漏连提示端点或中途断线未闭合计 0 分（连续3题0分或满5分钟中止）。',
}));

/**
 * 4.3 Beery VMI-6 分年龄段（2岁~15岁）原始分 → 标准分（Mean=100, SD=15）常模锚点查表矩阵
 */
export interface BeeryAgeNormAnchor {
  ageMonthsMin: number;
  ageMonthsMax: number;
  ageGroupLabel: string;
  expectedRawScoreMean100: {
    vmiMain: number; // 对应标准分 100 分的原始分均值
    vpSupp: number;  // VP 视觉感知补充测验对应标准分 100 分的原始分均值
    mcSupp: number;  // MC 运动协调补充测验对应标准分 100 分的原始分均值
  };
  rawScorePer15StdPoints: number; // 每差 1 个标准差 (15分) 对应的原始分跨度
}

export const BEERY_AGE_NORM_MATRIX: BeeryAgeNormAnchor[] = [
  { ageMonthsMin: 24, ageMonthsMax: 35, ageGroupLabel: '2岁0月–2岁11月', expectedRawScoreMean100: { vmiMain: 4, vpSupp: 5, mcSupp: 4 }, rawScorePer15StdPoints: 2.2 },
  { ageMonthsMin: 36, ageMonthsMax: 47, ageGroupLabel: '3岁0月–3岁11月', expectedRawScoreMean100: { vmiMain: 8, vpSupp: 9, mcSupp: 8 }, rawScorePer15StdPoints: 2.5 },
  { ageMonthsMin: 48, ageMonthsMax: 59, ageGroupLabel: '4岁0月–4岁11月', expectedRawScoreMean100: { vmiMain: 11, vpSupp: 13, mcSupp: 11 }, rawScorePer15StdPoints: 2.8 },
  { ageMonthsMin: 60, ageMonthsMax: 71, ageGroupLabel: '5岁0月–5岁11月', expectedRawScoreMean100: { vmiMain: 14, vpSupp: 16, mcSupp: 14 }, rawScorePer15StdPoints: 3.0 },
  { ageMonthsMin: 72, ageMonthsMax: 83, ageGroupLabel: '6岁0月–6岁11月', expectedRawScoreMean100: { vmiMain: 16, vpSupp: 18, mcSupp: 16 }, rawScorePer15StdPoints: 3.0 },
  { ageMonthsMin: 84, ageMonthsMax: 95, ageGroupLabel: '7岁0月–7岁11月', expectedRawScoreMean100: { vmiMain: 18, vpSupp: 20, mcSupp: 18 }, rawScorePer15StdPoints: 3.2 },
  { ageMonthsMin: 96, ageMonthsMax: 107, ageGroupLabel: '8岁0月–8岁11月', expectedRawScoreMean100: { vmiMain: 20, vpSupp: 22, mcSupp: 20 }, rawScorePer15StdPoints: 3.2 },
  { ageMonthsMin: 108, ageMonthsMax: 119, ageGroupLabel: '9岁0月–9岁11月', expectedRawScoreMean100: { vmiMain: 22, vpSupp: 24, mcSupp: 22 }, rawScorePer15StdPoints: 3.4 },
  { ageMonthsMin: 120, ageMonthsMax: 143, ageGroupLabel: '10岁0月–11岁11月', expectedRawScoreMean100: { vmiMain: 24, vpSupp: 26, mcSupp: 24 }, rawScorePer15StdPoints: 3.5 },
  { ageMonthsMin: 144, ageMonthsMax: 240, ageGroupLabel: '12岁0月–成人', expectedRawScoreMean100: { vmiMain: 26, vpSupp: 28, mcSupp: 26 }, rawScorePer15StdPoints: 3.5 },
];

// ============================================================================
// 五、 第三层量表 2 & 3：TVPS-4（7大子测验126题）与 MVPT-4（第4版45题全年龄通用）
// ============================================================================

export interface Tvps4SampleQuestion {
  questionIndex: number;
  promptText: string;
  exposureTimeSec: number | null; // 视觉记忆/顺序记忆呈现 5 秒后自动隐藏范图，其余子测验为 null（不限时呈现）
  targetShapeDesc: string;
  optionsDesc: [string, string, string, string]; // A, B, C, D 四个指认选项
  correctOptionIndex: 0 | 1 | 2 | 3;
}

export interface Tvps4SubtestSpec {
  subtestCode: PerceptualDomainCode;
  subtestOrder: number;
  nameCn: string;
  nameEn: string;
  itemCount: number;               // 每个子测验 18 道指认选择题（无运动参与）
  ceilingConsecutiveZeros: number; // 连续 3 题错误即中止该子测验
  clinicalMeaning: string;         // 临床功能解析
  classroomSymptomWhenLow: string; // 低分时在课堂/生活中的典型表现
  matchedSopCards: string[];       // 低分自动匹配的训练操作卡
  sampleDigitalItems: Tvps4SampleQuestion[]; // 双屏施测代表性题卡定义
}

export const TVPS_4_SUBTESTS: Tvps4SubtestSpec[] = [
  {
    subtestCode: 'DIS',
    subtestOrder: 1,
    nameCn: '视觉辨别',
    nameEn: 'Visual Discrimination (DIS)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '精准识别图形/字符在形状、方向、大小和细节特征上的异同',
    classroomSymptomWhenLow: '形近字混淆（如“人/入”、“b/d”、“6/9”）、常拿错外观相似的文具',
    matchedSopCards: ['操作卡 3-1', '操作卡 3-3'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '请看上面的图形，在下面 A、B、C、D 四个图形中，用手指指出哪一个和上面一模一样？',
        exposureTimeSec: null,
        targetShapeDesc: '带右上角黑点的正五边形',
        optionsDesc: ['带左上角黑点的五边形', '带右上角黑点的正五边形(正确)', '带右下角黑点的六边形', '无黑点的正五边形'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    subtestCode: 'MEM',
    subtestOrder: 2,
    nameCn: '视觉记忆',
    nameEn: 'Visual Memory (MEM)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '目标图形呈现 5 秒遮挡后，凭短时视觉工作记忆在选项中指认原图',
    classroomSymptomWhenLow: '看黑板抄写时“看一笔写一笔”、频繁抬头比对，刚学过的生字转眼就忘',
    matchedSopCards: ['操作卡 3-2', '操作卡 5-1'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '请仔细看这个图形 5 秒钟并记住它……现在图形藏起来了，请在下面指出刚才看到的是哪一个？',
        exposureTimeSec: 5,
        targetShapeDesc: '内部含垂直竖线与左半圆点的菱形',
        optionsDesc: ['内部含水平横线的菱形', '内部含右半圆点的菱形', '内部含垂直竖线与左半圆点的菱形(正确)', '外部带圆点的三角形'],
        correctOptionIndex: 2,
      },
    ],
  },
  {
    subtestCode: 'SPA',
    subtestOrder: 3,
    nameCn: '空间关系',
    nameEn: 'Spatial Relationships (SPA)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '判断图形整体或局部在二维空间中的朝向、相对位置与旋转差异',
    classroomSymptomWhenLow: '写字偏旁部首错位、田字格占位歪斜、拼图或积木仿搭方向颠倒',
    matchedSopCards: ['操作卡 3-3', '操作卡 4-1', '操作卡 4-2'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '下面四个图形中，请指出哪一个图形的朝向和上面目标图形完全一致？',
        exposureTimeSec: null,
        targetShapeDesc: '特定朝向的不对称折线钩',
        optionsDesc: ['旋转90°的折线钩', '水平镜像翻转的折线钩', '朝向完全一致的折线钩(正确)', '上下倒置的折线钩'],
        correctOptionIndex: 2,
      },
    ],
  },
  {
    subtestCode: 'CON',
    subtestOrder: 4,
    nameCn: '形式恒常性',
    nameEn: 'Form Constancy (CON)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '当目标图形发生放大、缩小、旋转或嵌入其他图形时，仍能识别其本质形状不变',
    classroomSymptomWhenLow: '换一种字体（如印刷体变手写体）或换个颜色教具就不认识同一个字/图形',
    matchedSopCards: ['操作卡 3-1', '操作卡 3-3'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '请看上面的目标图形，下面哪一个选项里包含形状本质完全一样的图形（即使它缩小或旋转了）？',
        exposureTimeSec: null,
        targetShapeDesc: '等腰梯形（底角60°）',
        optionsDesc: ['缩小65%且旋转30°的同比例等腰梯形(正确)', '平行四边形', '直角梯形', '不规则六边形'],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    subtestCode: 'SEQ',
    subtestOrder: 5,
    nameCn: '视觉顺序记忆',
    nameEn: 'Sequential Memory (SEQ)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '注视一串由多个图形组成的序列 5 秒后，准确回忆并选出相同排列顺序',
    classroomSymptomWhenLow: '抄写词语或电话号码时前后字符顺序颠倒、按步骤图穿衣/做手工漏步骤',
    matchedSopCards: ['操作卡 3-2', '操作卡 4-2', '操作卡 5-1'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '请从左往右记住这一排图形的顺序（呈现5秒）：【○—△—□—☆】……现在请指出哪一排顺序是完全一样的？',
        exposureTimeSec: 5,
        targetShapeDesc: '4元素序列：圆—三角—方—星',
        optionsDesc: ['○—□—△—☆', '○—△—□—☆(正确)', '△—○—□—☆', '○—△—☆—□'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    subtestCode: 'FGR',
    subtestOrder: 6,
    nameCn: '视觉图形-背景',
    nameEn: 'Visual Figure-Ground (FGR)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '从繁杂、交叠的干扰背景线条中迅速滤除噪音并分离出指定目标图形',
    classroomSymptomWhenLow: '在乱桌面上找不到铅笔、洗衣机里找不到配对袜子、看满页文字时视觉迷失',
    matchedSopCards: ['操作卡 3-1', '操作卡 2-2'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '请看上面的目标图形，它藏在下面哪一张复杂的网状背景图里？请用手指指出来。',
        exposureTimeSec: null,
        targetShapeDesc: '隐藏在波浪网格线中的目标几何形',
        optionsDesc: ['含干扰变形图的网格', '含1:1目标图形的网格(正确)', '含镜像翻转图的网格', '含缺角变形图的网格'],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    subtestCode: 'CLO',
    subtestOrder: 7,
    nameCn: '视觉完型',
    nameEn: 'Visual Closure (CLO)',
    itemCount: 18,
    ceilingConsecutiveZeros: 3,
    clinicalMeaning: '当图形轮廓缺失、断裂或被部分遮挡时，在脑中自动补全并识别完整图形',
    classroomSymptomWhenLow: '阅读速度极慢（必须看清每一个笔画才能认字）、拼图和点连线困难',
    matchedSopCards: ['操作卡 3-3', '操作卡 4-3'],
    sampleDigitalItems: [
      {
        questionIndex: 1,
        promptText: '如果把下面虚线断开的图形连完整（不移动线条），哪一个会变成上面一模一样的图形？',
        exposureTimeSec: null,
        targetShapeDesc: '完整几何图形 vs 缺失部分边线的断续轮廓',
        optionsDesc: ['顶点外扩失真的断线图', '缺少内部对角特征的断线图', '与原图100%重合的断线图(正确)', '发生镜像翻转的断线图'],
        correctOptionIndex: 2,
      },
    ],
  },
];

/**
 * 5.2 MVPT-4（Motor-Free Visual Perception Test - 4，空间视觉运动感知检查系统·第4版）全量配置与常模
 * 说明：已彻底弃用旧版 MVPT-3，全系统统一采用最新第 4 版 MVPT-4（Colarusso & Hammill, ATP Assessments），
 * 全表共 45 道黑白线条图 4选1（A/B/C/D）指认题，适用年龄 4岁0个月–成人，无需任何握笔书写动作。
 */
export interface Mvpt4DomainSectionSpec {
  domainCode: 'DIS' | 'SPA' | 'MEM' | 'FGR' | 'CLO';
  domainNameCn: string;
  domainNameEn: string;
  itemNumbers: number[];           // 对应 MVPT-4 题册中的题号列表（共 45 题，每维度 9 题）
  exposureTimeSec: number | null;  // 视觉记忆维度呈现 5 秒后翻页指认，其余维度不限时
  standardCueText: string;         // 评估师标准口头指导语
  matchedSopCards: string[];       // 该维度错题集中时自动推荐的训练操作卡
}

export const MVPT_4_SCALE_SPEC = {
  scaleCode: 'MVPT_4' as const,
  nameCn: 'MVPT-4 无运动视觉感知测验（第4版·空间视觉运动感知检查系统）',
  authors: 'Ronald P. Colarusso & Donald D. Hammill (ATP Assessments)',
  applicableAgeYears: '4岁0个月–成人（全表统一施测 45 题，约 20–25 分钟，无需任何握笔书写动作）',
  totalItems: 45,
  clinicalPositioning:
    '作为快速筛查与基线定级工具，特别适合注意力维持短、低龄（4–8岁）或伴随手部精细运动障碍的孤独症学生；与 Beery VMI-6 联用可精准区分“看不准（L2 感知短板）”与“手画不准（L3 运动短板）”。',
  domainSections: [
    {
      domainCode: 'DIS',
      domainNameCn: '视觉辨别（Visual Discrimination）',
      domainNameEn: 'Visual Discrimination',
      itemNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      exposureTimeSec: null,
      standardCueText: '“请看上面这个图形，在下面 A、B、C、D 四个图形里，用手指指出哪一个和上面一模一样？”',
      matchedSopCards: ['操作卡 3-1', '操作卡 3-3'],
    },
    {
      domainCode: 'FGR',
      domainNameCn: '图形-背景分离（Figure-Ground）',
      domainNameEn: 'Figure-Ground',
      itemNumbers: [10, 11, 12, 13, 14, 15, 16, 17, 18],
      exposureTimeSec: null,
      standardCueText: '“请看上面这个图形，它藏在下面 A、B、C、D 哪一张复杂图里？请用手指指出来。”',
      matchedSopCards: ['操作卡 3-1', '操作卡 2-2'],
    },
    {
      domainCode: 'MEM',
      domainNameCn: '视觉记忆（Visual Memory · 呈现5秒翻页）',
      domainNameEn: 'Visual Memory (5-Second Exposure)',
      itemNumbers: [19, 20, 21, 22, 23, 24, 25, 26, 27],
      exposureTimeSec: 5,
      standardCueText: '“请仔细看这个图形 5 秒钟并记住它……（满5秒翻页/遮挡）现在请在 A、B、C、D 里指出刚才看到的是哪一个？”',
      matchedSopCards: ['操作卡 3-2', '操作卡 5-1'],
    },
    {
      domainCode: 'CLO',
      domainNameCn: '视觉完型（Visual Closure · 断线补全）',
      domainNameEn: 'Visual Closure',
      itemNumbers: [28, 29, 30, 31, 32, 33, 34, 35, 36],
      exposureTimeSec: null,
      standardCueText: '“如果把下面虚线断开的图形画完整，但不能移动线条，哪一个会变成上面一模一样的图形？”',
      matchedSopCards: ['操作卡 3-3', '操作卡 4-3'],
    },
    {
      domainCode: 'SPA',
      domainNameCn: '空间关系（Spatial Relationships · 方向与旋转）',
      domainNameEn: 'Spatial Relationships',
      itemNumbers: [37, 38, 39, 40, 41, 42, 43, 44, 45],
      exposureTimeSec: null,
      standardCueText: '“请看下面 A、B、C、D 四个图形，哪一个图形的朝向或结构与目标要求一致？”',
      matchedSopCards: ['操作卡 3-3', '操作卡 4-1', '操作卡 4-2'],
    },
  ] as Mvpt4DomainSectionSpec[],
  /** MVPT-4 (满分45分) 内置 4–13 岁锚点表（项目近似）；14 岁以上需手册标准分 */
  ageNormTable45Items: [
    { ageYears: 4, expectedMeanRaw: 15, sdRaw: 4.2, ageEquivalentLabel: '4岁0月–4岁11月' },
    { ageYears: 5, expectedMeanRaw: 20, sdRaw: 4.5, ageEquivalentLabel: '5岁0月–5岁11月' },
    { ageYears: 6, expectedMeanRaw: 25, sdRaw: 4.6, ageEquivalentLabel: '6岁0月–6岁11月' },
    { ageYears: 7, expectedMeanRaw: 29, sdRaw: 4.5, ageEquivalentLabel: '7岁0月–7岁11月' },
    { ageYears: 8, expectedMeanRaw: 33, sdRaw: 4.3, ageEquivalentLabel: '8岁0月–8岁11月' },
    { ageYears: 9, expectedMeanRaw: 35, sdRaw: 4.0, ageEquivalentLabel: '9岁0月–9岁11月' },
    { ageYears: 10, expectedMeanRaw: 37, sdRaw: 3.8, ageEquivalentLabel: '10岁0月–10岁11月' },
    { ageYears: 11, expectedMeanRaw: 38, sdRaw: 3.6, ageEquivalentLabel: '11岁0月–11岁11月' },
    { ageYears: 12, expectedMeanRaw: 39, sdRaw: 3.5, ageEquivalentLabel: '12岁0月–12岁11月' },
    { ageYears: 13, expectedMeanRaw: 40, sdRaw: 3.4, ageEquivalentLabel: '13岁0月以上（内置表上限）' },
  ],
};

/**
 * 5.3 MVPT-4 45 条题号索引（不含官方图版；供记分台与训练题卡生成遍历）
 */
export interface Mvpt4ExplicitItemSpec {
  itemNumber: number; // 1 ~ 45
  domainCode: 'DIS' | 'FGR' | 'MEM' | 'CLO' | 'SPA';
  domainNameCn: string;
  exposureTimeSec: number | null; // 第 19–27 题视觉记忆呈现 5 秒后自动遮挡
  defaultCorrectOption: 'A' | 'B' | 'C' | 'D';
  primitiveId: string;
  standardCueText: string;
}

export const MVPT_4_45_ITEMS: Mvpt4ExplicitItemSpec[] = Array.from({ length: 45 }, (_, idx) => {
  const itemNumber = idx + 1;
  const sec =
    MVPT_4_SCALE_SPEC.domainSections.find((s) => s.itemNumbers.includes(itemNumber)) ||
    MVPT_4_SCALE_SPEC.domainSections[0];
  const optionLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  return {
    itemNumber,
    domainCode: sec.domainCode,
    domainNameCn: sec.domainNameCn,
    exposureTimeSec: sec.exposureTimeSec,
    defaultCorrectOption: optionLetters[(itemNumber * 3 + 1) % 4],
    primitiveId: `PRIM_0${((itemNumber - 1) % 9) + 1}`,
    standardCueText: sec.standardCueText,
  };
});

/**
 * 5.4 TVPS-4 126 条题号索引（7 大子测验 × 18 题，不含题干/选项）+ 5–18 岁项目近似查表矩阵
 */
export interface Tvps4ExplicitItemSpec {
  globalItemIndex: number; // 1 ~ 126
  subtestCode: PerceptualDomainCode;
  subtestNameCn: string;
  subtestItemNumber: number; // 1 ~ 18
  exposureTimeSec: number | null;
  defaultCorrectOption: 'A' | 'B' | 'C' | 'D';
}

export const TVPS_4_126_ITEMS: Tvps4ExplicitItemSpec[] = TVPS_4_SUBTESTS.flatMap((sub, sIdx) =>
  Array.from({ length: 18 }, (_, qIdx) => {
    const subtestItemNumber = qIdx + 1;
    const globalItemIndex = sIdx * 18 + subtestItemNumber;
    const optionLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    return {
      globalItemIndex,
      subtestCode: sub.subtestCode,
      subtestNameCn: sub.nameCn,
      subtestItemNumber,
      exposureTimeSec: sub.subtestCode === 'MEM' || sub.subtestCode === 'SEQ' ? 5 : null,
      defaultCorrectOption: optionLetters[(globalItemIndex * 3 + 1) % 4],
    };
  })
);

export interface Tvps4AgeNormAnchor {
  ageYearsMin: number;
  ageYearsMax: number;
  ageGroupLabel: string;
  expectedSubtestRawMean10: Record<PerceptualDomainCode, number>; // 各子测验对应量表分 10 分 (Mean=10, SD=3) 的原始分均值 (满分18)
  rawPer3ScaledPoints: number; // 每 1 个标准差 (3个量表分) 对应的原始分跨度
}

export const TVPS_4_AGE_NORM_MATRIX: Tvps4AgeNormAnchor[] = [
  { ageYearsMin: 5, ageYearsMax: 5, ageGroupLabel: '5岁0月–5岁11月', expectedSubtestRawMean10: { DIS: 7, MEM: 6, SPA: 7, CON: 6, SEQ: 6, FGR: 6, CLO: 6 }, rawPer3ScaledPoints: 2.2 },
  { ageYearsMin: 6, ageYearsMax: 6, ageGroupLabel: '6岁0月–6岁11月', expectedSubtestRawMean10: { DIS: 8, MEM: 8, SPA: 8, CON: 7, SEQ: 7, FGR: 7, CLO: 7 }, rawPer3ScaledPoints: 2.3 },
  { ageYearsMin: 7, ageYearsMax: 7, ageGroupLabel: '7岁0月–7岁11月', expectedSubtestRawMean10: { DIS: 10, MEM: 9, SPA: 10, CON: 9, SEQ: 9, FGR: 9, CLO: 8 }, rawPer3ScaledPoints: 2.4 },
  { ageYearsMin: 8, ageYearsMax: 8, ageGroupLabel: '8岁0月–8岁11月', expectedSubtestRawMean10: { DIS: 11, MEM: 10, SPA: 11, CON: 10, SEQ: 10, FGR: 10, CLO: 10 }, rawPer3ScaledPoints: 2.4 },
  { ageYearsMin: 9, ageYearsMax: 9, ageGroupLabel: '9岁0月–9岁11月', expectedSubtestRawMean10: { DIS: 12, MEM: 11, SPA: 12, CON: 11, SEQ: 11, FGR: 11, CLO: 11 }, rawPer3ScaledPoints: 2.5 },
  { ageYearsMin: 10, ageYearsMax: 11, ageGroupLabel: '10岁0月–11岁11月', expectedSubtestRawMean10: { DIS: 13, MEM: 13, SPA: 13, CON: 12, SEQ: 12, FGR: 12, CLO: 12 }, rawPer3ScaledPoints: 2.5 },
  { ageYearsMin: 12, ageYearsMax: 14, ageGroupLabel: '12岁0月–14岁11月', expectedSubtestRawMean10: { DIS: 15, MEM: 14, SPA: 15, CON: 14, SEQ: 14, FGR: 14, CLO: 14 }, rawPer3ScaledPoints: 2.4 },
  { ageYearsMin: 15, ageYearsMax: 18, ageGroupLabel: '15岁0月–18岁11月', expectedSubtestRawMean10: { DIS: 16, MEM: 15, SPA: 16, CON: 15, SEQ: 15, FGR: 15, CLO: 15 }, rawPer3ScaledPoints: 2.3 },
];

// ============================================================================
// 六、 第三层量表 4：DEM 发育性眼动测验（含完整 Test A / Test B / Test C 80数字刺激矩阵）
// ============================================================================

export const DEM_STIMULUS_MATRICES = {
  /** Test A：左右两列垂直对齐数字（每列20个，共40个数字，评估无水平扫视负荷下的自动认读速度） */
  TEST_A_VERTICAL_COLUMNS: {
    leftColumn20: [3, 7, 5, 9, 8, 2, 5, 7, 4, 6, 1, 4, 7, 6, 3, 7, 9, 3, 9, 2],
    rightColumn20: [4, 5, 2, 1, 7, 5, 3, 7, 4, 8, 7, 4, 6, 5, 2, 9, 2, 3, 6, 4],
  },
  /** Test B：左右两列垂直对齐数字（每列20个，共40个数字，与 Test A 合计 80 个纵向数字） */
  TEST_B_VERTICAL_COLUMNS: {
    leftColumn20: [6, 3, 2, 9, 1, 7, 4, 6, 5, 2, 5, 3, 7, 4, 8, 4, 5, 2, 1, 7],
    rightColumn20: [2, 5, 7, 4, 6, 3, 7, 5, 9, 8, 9, 3, 9, 2, 1, 4, 7, 6, 3, 7],
  },
  /** Test C：16行 × 每行5个不规则水平间距数字（共80个数字，评估跨行折返与水平按行扫视准确性） */
  TEST_C_HORIZONTAL_16X5_GRID: [
    [3, 7, 5, 9, 8],
    [2, 5, 7, 4, 6],
    [1, 4, 7, 6, 3],
    [7, 9, 3, 9, 2],
    [4, 5, 2, 1, 7],
    [5, 3, 7, 4, 8],
    [7, 4, 6, 5, 2],
    [9, 2, 3, 6, 4],
    [6, 3, 2, 9, 1],
    [7, 4, 6, 5, 2],
    [5, 3, 7, 4, 8],
    [4, 5, 2, 1, 7],
    [2, 5, 7, 4, 6],
    [3, 7, 5, 9, 8],
    [9, 3, 9, 2, 1],
    [4, 7, 6, 3, 7],
  ],
};

export interface DemAgeNormRow {
  ageYears: number;
  expectedVerticalSecMean: number;    // Test A + Test B 纵向认读正常平均耗时 (秒)
  expectedHorizontalSecMean: number;  // Test C 横向修正后认读正常平均耗时 (秒)
  expectedRatioMean: number;          // 正常纵横比均值 (Horizontal / Vertical)
  abnormalRatioCutoff: number;        // 15th 百分位异常截断值（高于此值提示扫视眼动障碍）
}

export const DEM_AGE_NORMS_TABLE: DemAgeNormRow[] = [
  { ageYears: 6, expectedVerticalSecMean: 63.0, expectedHorizontalSecMean: 99.0, expectedRatioMean: 1.58, abnormalRatioCutoff: 1.82 },
  { ageYears: 7, expectedVerticalSecMean: 51.0, expectedHorizontalSecMean: 71.0, expectedRatioMean: 1.39, abnormalRatioCutoff: 1.60 },
  { ageYears: 8, expectedVerticalSecMean: 43.0, expectedHorizontalSecMean: 53.0, expectedRatioMean: 1.24, abnormalRatioCutoff: 1.41 },
  { ageYears: 9, expectedVerticalSecMean: 38.0, expectedHorizontalSecMean: 45.0, expectedRatioMean: 1.19, abnormalRatioCutoff: 1.33 },
  { ageYears: 10, expectedVerticalSecMean: 35.0, expectedHorizontalSecMean: 41.0, expectedRatioMean: 1.17, abnormalRatioCutoff: 1.29 },
  { ageYears: 11, expectedVerticalSecMean: 33.0, expectedHorizontalSecMean: 38.0, expectedRatioMean: 1.15, abnormalRatioCutoff: 1.26 },
  { ageYears: 12, expectedVerticalSecMean: 31.0, expectedHorizontalSecMean: 35.0, expectedRatioMean: 1.13, abnormalRatioCutoff: 1.24 },
  { ageYears: 13, expectedVerticalSecMean: 29.5, expectedHorizontalSecMean: 33.0, expectedRatioMean: 1.12, abnormalRatioCutoff: 1.22 },
];

export type DemClinicalBehaviorType =
  | 'TYPE_I_NORMAL'                     // I型：纵时、横时、纵横比均正常
  | 'TYPE_II_OCULOMOTOR_DYSFUNCTION'    // II型：纵时正常，横时延长且纵横比显著偏高 → 典型扫视眼动控制障碍
  | 'TYPE_III_AUTOMATICITY_PROBLEM'     // III型：纵时与横时同比例延长，但纵横比正常 → 底层视觉-语言自动命名提取慢
  | 'TYPE_IV_COMBINED_DEFICIT';         // IV型：纵时、横时、纵横比全部异常 → 命名自动性与扫视眼动双重缺陷

// ============================================================================
// 七、 第三层量表 5、6、7：TVMS-3（精细误差分析）、RAN/RAS（快速命名）与 SPSRC（L0感统）
// ============================================================================

export const TVMS_3_ERROR_CATEGORIES = [
  { code: 'ERR_CLOSURE', nameCn: '线条闭合误差（Closure Error）', desc: '图形交界处存在 >3mm 缺口或过度出头交叉' },
  { code: 'ERR_ANGLE', nameCn: '角度失真误差（Angle Error）', desc: '直角/锐角被画成圆弧角，或角度偏差 >20°' },
  { code: 'ERR_INTERSECTION', nameCn: '线条交集误差（Intersection Error）', desc: '应交于一点的多条线错位分离，或相切图形发生穿透' },
  { code: 'ERR_LINE_QUALITY', nameCn: '线质与运笔控制误差（Line Quality）', desc: '线条剧烈抖动、反复描摹接笔或折返断线' },
  { code: 'ERR_LENGTH_RATIO', nameCn: '长短比例失调（Length & Proportion）', desc: '图形长宽比或组件大小比例偏离范图 >30%' },
  { code: 'ERR_ROTATION_SPACE', nameCn: '空间旋转与边界偏离（Rotation & Spatial）', desc: '图形整体倾斜旋转 >20° 或严重偏离作答框中心' },
];

export interface Tvms3ItemSpec {
  itemNumber: number; // 1 ~ 39 (Martin 2010 TVMS-3 标准 39 幅几何临摹图，每题 0/1/2 三级精度计分，满分 78 分)
  titleCn: string;
  maxScore: 2;
  scoringRubric: {
    score2: string; // 无显著失真误差
    score1: string; // 存在 1 项轻微误差（如角度偏差 10°~20° 或缺口 1~3mm）
    score0: string; // 存在 ≥2 项严重失真或结构无法辨认
  };
}

/**
 * 7.1.2 TVMS-3 39 条结构化索引（图形复用 VMI 基元；非官方 39 幅题卡）
 */
export const TVMS_3_39_ITEMS: Tvms3ItemSpec[] = Array.from({ length: 39 }, (_, idx) => {
  const num = idx + 1;
  const baseVmi = BEERY_VMI_6_ITEMS[idx % BEERY_VMI_6_ITEMS.length];
  return {
    itemNumber: num,
    titleCn: `TVMS-3 精细运动临摹图 #${num}（基准构型：${baseVmi.titleCn.split('（')[0]}）`,
    maxScore: 2,
    scoringRubric: {
      score2: '线条闭合缺口 ≤1mm、角度误差 ≤10°、比例与交点精准（计 2 分）',
      score1: '整体构型正确，但存在 1 项 TVMS-3 轻微误差（闭合/角度/交集/线质/比例/旋转之一，计 1 分）',
      score0: '存在 ≥2 项明显误差或连续 3 题得 0 分触发中止（计 0 分）',
    },
  };
});

export const RAN_RAS_SCALE_CONFIG = {
  officialCitation: 'Wolf, M., & Denckla, M. B. (2005). RAN/RAS: Rapid Automatized Naming and Rapid Alternating Stimulus Tests. Austin, TX: PRO-ED.',
  stimulusStatus: 'PROJECT_GENERATED' as const,
  subtests: [
    {
      code: 'RAN_COLORS',
      nameCn: '颜色快速命名（5行×10列=50项标准矩阵，无相邻重复）',
      stimuliPool: ['红', '黄', '蓝', '绿', '黑'],
      grid5x10: [
        ['红', '黄', '蓝', '绿', '黑', '黄', '红', '绿', '蓝', '黑'],
        ['蓝', '绿', '红', '黑', '黄', '绿', '蓝', '黄', '黑', '红'],
        ['黄', '黑', '绿', '红', '蓝', '黑', '红', '蓝', '绿', '黄'],
        ['绿', '红', '黄', '蓝', '黑', '红', '绿', '黑', '黄', '蓝'],
        ['黑', '蓝', '红', '黄', '绿', '蓝', '黄', '红', '绿', '黑'],
      ],
    },
    {
      code: 'RAN_NUMBERS',
      nameCn: '数字快速命名（5行×10列=50项标准矩阵，无相邻重复）',
      stimuliPool: ['2', '4', '6', '7', '9'],
      grid5x10: [
        ['2', '6', '9', '4', '7', '6', '2', '7', '9', '4'],
        ['9', '4', '2', '7', '6', '4', '9', '6', '7', '2'],
        ['6', '7', '4', '2', '9', '7', '2', '9', '4', '6'],
        ['4', '2', '6', '9', '7', '2', '4', '7', '6', '9'],
        ['7', '9', '2', '6', '4', '9', '6', '2', '4', '7'],
      ],
    },
    {
      code: 'RAN_OBJECTS',
      nameCn: '常见物体快速命名（5行×10列=50项标准矩阵，无相邻重复）',
      stimuliPool: ['手', '书', '狗', '星', '树'],
      grid5x10: [
        ['手', '书', '狗', '星', '树', '书', '手', '星', '狗', '树'],
        ['狗', '星', '手', '树', '书', '星', '狗', '书', '树', '手'],
        ['书', '树', '星', '手', '狗', '树', '手', '狗', '星', '书'],
        ['星', '手', '书', '狗', '树', '手', '星', '树', '书', '狗'],
        ['树', '狗', '手', '书', '星', '狗', '书', '手', '星', '树'],
      ],
    },
    {
      code: 'RAS_2_SET',
      nameCn: '数字-颜色快速交替命名（5行×10列=50项类别交替矩阵）',
      stimuliPool: ['红', '2', '蓝', '7', '绿', '4', '黄', '9', '6'],
      grid5x10: [
        ['红', '2', '蓝', '7', '绿', '4', '黄', '9', '红', '6'],
        ['蓝', '4', '黄', '2', '红', '9', '绿', '7', '黄', '4'],
        ['绿', '9', '红', '4', '蓝', '2', '黄', '6', '绿', '9'],
        ['黄', '7', '绿', '2', '红', '4', '蓝', '9', '红', '2'],
        ['蓝', '6', '黄', '9', '绿', '7', '红', '4', '蓝', '7'],
      ],
    },
  ],
  ageNormMaxSecondsFor50Items: {
    5: 65,
    6: 52,
    7: 44,
    8: 38,
    9: 34,
    10: 31,
    11: 29,
    12: 27,
  } as Record<number, number>,
};

export const SPSRC_L0_SENSORY_CHECKLIST = [
  { code: 'L0_CHK_01', category: '抗重力与躯干核心稳定', item: '四点支撑（手膝跪位抬头看前方）维持时间不足 5 秒即塌腰或低头', weight: 2 },
  { code: 'L0_CHK_02', category: '坐姿维持与近端稳定', item: '桌前端坐不足 3 分钟即滑下椅子、趴在桌面或必须用手撑头才能视物', weight: 2 },
  { code: 'L0_CHK_03', category: '前庭觉与头部抗重力', item: '俯卧滑板抬头推球困难，或身体轻微晃动/旋转后视线长时间无法聚焦', weight: 2 },
  { code: 'L0_CHK_04', category: '本体觉与上肢力量调节', item: '握笔或抓握教具时力度极端（捏断笔尖或握不住频繁掉落），手腕无法贴稳桌面', weight: 1 },
  { code: 'L0_CHK_05', category: '双侧整合与跨中线', item: '右手无法自然跨过身体中线去拿左侧物品，画横线到中线处必须换手或挪动身体', weight: 1 },
  { code: 'L0_CHK_06', category: '生理唤醒度调节', item: '进入训练室常处于极度兴奋跑跳或极度倦怠低唤醒状态，无法直接进入桌面视觉任务', weight: 2 },
];

/**
 * 7.3.2 SPSRC 双领域 × 子量表结构（题干未收录；支持治疗师录入完整 SPSRC 量表分）
 * 说明：支持治疗师在评估中心录入完整 SPSRC 量表分，或直接使用上方 6 项 L0 课堂实操核查项快速定级。
 */
export const SPSRC_FULL_SCALE_STRUCTURE = {
  officialCitation: 'Lai, C. Y. Y., Chung, J. C. C., Chan, C. C. H., & Li-Tsang, C. W. P. (2019). Sensory Processing and Self-Regulation Checklist (SPSRC).',
  applicableAgeYears: '3–8 岁儿童（家长/照护者 5 级李克特量表评定：1=从不 ~ 5=总是，全表共 130 题）',
  itemTextsIncluded: false,
  parts: [
    {
      partCode: 'PART_A_SELF_REGULATION',
      nameCn: '第一部分：生理与行为自我调节能力（共 37 题）',
      subscales: [
        { code: 'SR_AUTONOMIC', nameCn: '自主神经生理调节（睡眠/呼吸/体温/消化节律）', itemCount: 12 },
        { code: 'SR_EMOTIONAL', nameCn: '情绪调节与安抚恢复力', itemCount: 13 },
        { code: 'SR_BEHAVIORAL', nameCn: '注意维持与行为组织转换', itemCount: 12 },
      ],
    },
    {
      partCode: 'PART_B_SENSORY_PROCESSING',
      nameCn: '第二部分：多通道感觉处理能力（共 93 题）',
      subscales: [
        { code: 'SP_AUDITORY', nameCn: '听觉处理（防御/低反应/寻求）', itemCount: 16 },
        { code: 'SP_VISUAL', nameCn: '视觉处理（畏光闪烁敏感/注视逃避/视觉寻求）', itemCount: 18 },
        { code: 'SP_TACTILE', nameCn: '触觉处理（触觉防御/迟钝）', itemCount: 21 },
        { code: 'SP_VESTIBULAR_PROPRIO', nameCn: '前庭觉与本体觉处理（重力不安全感/姿势维持/肌肉张力）', itemCount: 24 },
        { code: 'SP_GUSTATORY_OLFACTORY', nameCn: '味觉与嗅觉处理', itemCount: 14 },
      ],
    },
  ],
  clinicalCutoffRule: {
    normalRange: 'T分数 ≥ 40（高于 -1.0 SD）：感觉处理与自我调节正常',
    borderlineDeficit: 'T分数 30–39（-1.0 SD 至 -2.0 SD）：存在轻中度感觉调节困难，建议课堂前配置 3 分钟 L0 感觉唤醒活动',
    definiteDeficit: 'T分数 < 30（低于 -2.0 SD）：显著感觉处理与姿势底座障碍，强制优先定级 L0 身体准备阶段',
  },
};

// ============================================================================
// 八、 参数化矢量图形（SVG）刺激题卡动态生成引擎（支持 MVPT-4 全45题 & TVPS-4 全126题）
// ============================================================================

/**
 * 为什么使用参数化 SVG 引擎而非 AI 生图（PNG/JPG）？
 * 1. 临床几何零失真：MVPT-4 与 TVPS-4 的考察核心是角度、闭合缺口、镜像旋转与背景分离，SVG 数学坐标可保证 100% 几何精确。
 * 2. 4选1（A/B/C/D）同源变换：通过 SVG `<g transform="rotate(...) scale(...)"/>`、`stroke-dasharray`（视觉完型断线）
 *    和叠加网格干扰层（图形-背景分离），无需任何外部图片即可动态渲染全部 45 道 MVPT-4 与 126 道 TVPS-4 双屏指认题卡。
 */
export interface PerceptualSvgPrimitive {
  id: string;
  nameCn: string;
  outerPaths: string[];        // 主轮廓矢量路径 (基于 160×160 viewBox)
  innerDetailPaths: string[];  // 内部细节特征路径（用于视觉辨别/记忆的微差干扰项变换）
  distractorOuterPath: string; // 拓扑变形干扰路径（用于形式恒常性/视觉完型的近形干扰项）
}

export const PERCEPTUAL_SVG_PRIMITIVES: PerceptualSvgPrimitive[] = [
  {
    id: 'PRIM_01_PENTAGON_FLAG',
    nameCn: '带偏心特征线的正五边形',
    outerPaths: ['M 80 24 L 134 62 L 114 128 L 46 128 L 26 62 Z'],
    innerDetailPaths: ['M 80 24 L 80 82 L 118 82', 'M 60 58 A 5 5 0 1 0 59.9 58 Z'],
    distractorOuterPath: 'M 80 24 L 130 52 L 130 112 L 80 136 L 30 112 L 30 52 Z',
  },
  {
    id: 'PRIM_02_ASYM_HOOK_FRAME',
    nameCn: '非对称阶梯折角框',
    outerPaths: ['M 32 32 L 104 32 L 104 72 L 132 72 L 132 128 L 32 128 Z'],
    innerDetailPaths: ['M 32 80 L 76 80 L 76 128', 'M 64 52 A 6 6 0 1 0 63.9 52 Z'],
    distractorOuterPath: 'M 32 32 L 128 32 L 128 96 L 88 96 L 88 128 L 32 128 Z',
  },
  {
    id: 'PRIM_03_DIAMOND_NOTCH',
    nameCn: '内嵌十字与圆点的斜方晶体',
    outerPaths: ['M 80 20 L 136 80 L 80 140 L 24 80 Z'],
    innerDetailPaths: ['M 52 80 L 108 80', 'M 80 52 L 80 108', 'M 96 64 A 5 5 0 1 0 95.9 64 Z'],
    distractorOuterPath: 'M 80 22 L 128 65 L 110 134 L 50 134 L 32 65 Z',
  },
  {
    id: 'PRIM_04_TRAPEZOID_ARCH',
    nameCn: '双耳翼等腰梯形冠',
    outerPaths: ['M 44 40 L 116 40 L 136 124 L 24 124 Z'],
    innerDetailPaths: ['M 44 40 L 80 92 L 116 40', 'M 80 92 L 80 124'],
    distractorOuterPath: 'M 32 40 L 128 40 L 112 124 L 48 124 Z',
  },
  {
    id: 'PRIM_05_HEX_STAR_CORE',
    nameCn: '六角星棱镜切面',
    outerPaths: ['M 80 22 L 128 50 L 128 110 L 80 138 L 32 110 L 32 50 Z'],
    innerDetailPaths: ['M 32 50 L 128 110', 'M 128 50 L 80 80', 'M 55 80 A 5 5 0 1 0 54.9 80 Z'],
    distractorOuterPath: 'M 80 22 L 134 62 L 114 128 L 46 128 L 26 62 Z',
  },
  {
    id: 'PRIM_06_DIRECTIONAL_CHEVRON',
    nameCn: '单侧尾翼方向燕尾镖',
    outerPaths: ['M 28 80 L 92 30 L 132 30 L 88 80 L 132 130 L 92 130 Z'],
    innerDetailPaths: ['M 58 80 L 112 80', 'M 72 56 A 4 4 0 1 0 71.9 56 Z'],
    distractorOuterPath: 'M 28 80 L 84 30 L 132 55 L 96 80 L 132 105 L 84 130 Z',
  },
  {
    id: 'PRIM_07_OVERLAP_TRI_SQUARE',
    nameCn: '偏置三角与直角框咬合体',
    outerPaths: ['M 30 46 L 102 46 L 102 126 L 30 126 Z', 'M 82 28 L 136 112 L 54 112 Z'],
    innerDetailPaths: ['M 48 68 L 76 68 L 76 98'],
    distractorOuterPath: 'M 30 46 L 116 46 L 116 126 L 30 126 Z',
  },
  {
    id: 'PRIM_08_CRESCENT_POLYGON',
    nameCn: '凹角多面折线盾',
    outerPaths: ['M 36 30 L 124 30 L 136 78 L 80 134 L 24 78 Z'],
    innerDetailPaths: ['M 36 30 L 80 78 L 124 30', 'M 102 78 A 5 5 0 1 0 101.9 78 Z'],
    distractorOuterPath: 'M 36 30 L 124 30 L 124 96 L 80 134 L 36 96 Z',
  },
  {
    id: 'PRIM_09_NESTED_3D_WEDGE',
    nameCn: '三维透视斜切楔形块',
    outerPaths: ['M 28 96 L 76 34 L 134 54 L 134 118 L 76 132 Z'],
    innerDetailPaths: ['M 76 34 L 76 132', 'M 76 84 L 134 54', 'M 52 88 A 4 4 0 1 0 51.9 88 Z'],
    distractorOuterPath: 'M 28 74 L 76 34 L 134 54 L 134 118 L 76 132 Z',
  },
];

export interface GeneratedPerceptualSvgCard {
  scaleCode: 'MVPT_4' | 'TVPS_4' | 'BEERY_VP';
  domainCode: PerceptualDomainCode;
  domainNameCn: string;
  itemNumber: number;
  exposureTimeSec: number | null; // 视觉记忆(MEM)/顺序记忆(SEQ)为 5 秒后自动遮挡目标图，其余为 null
  promptText: string;
  targetSvgMarkup: string;        // 顶部标准目标刺激图 SVG 字符串 (可直接 dangerouslySetInnerHTML 或组件渲染)
  optionsSvgMarkup: [string, string, string, string]; // A, B, C, D 四个选项的完整 SVG 字符串
  optionLabels: ['A', 'B', 'C', 'D'];
  correctOptionIndex: 0 | 1 | 2 | 3;
  distractorAnalysis: [string, string, string, string]; // 供评估师端查看每个选项对应的视觉错误类型
}

/**
 * 内部辅助函数：将路径包装为标准 160×160 黑白高对比度临床题卡 SVG
 */
function wrapSvgPaths(
  paths: string[],
  options?: {
    transform?: string;
    dashedClosure?: boolean;
    addFigureGroundNoise?: boolean;
    noiseVariant?: number;
  }
): string {
  const dashAttr = options?.dashedClosure ? ' stroke-dasharray="10 9"' : '';
  const groupTransform = options?.transform ? ` transform="${options.transform}"` : '';

  // 图形-背景分离（FGR）专用：生成多条穿插波浪线与斜网格背景噪音层
  let noiseMarkup = '';
  if (options?.addFigureGroundNoise) {
    const nv = options.noiseVariant ?? 0;
    const shift = (nv % 3) * 8;
    noiseMarkup = `
      <g stroke="#64748B" stroke-width="1.75" fill="none" opacity="0.62">
        <path d="M 10 ${28 + shift} Q 80 ${65 - shift} 150 ${32 + shift}" />
        <path d="M 10 ${68 - shift} Q 80 ${25 + shift} 150 ${72 - shift}" />
        <path d="M 10 ${108 + shift} Q 80 ${142 - shift} 150 ${104 + shift}" />
        <path d="M 10 ${136 - shift} Q 80 ${95 + shift} 150 ${132 - shift}" />
        <path d="M ${28 + shift} 10 L ${132 - shift} 150" />
        <path d="M ${132 - shift} 10 L ${28 + shift} 150" />
        <circle cx="80" cy="80" r="${56 - shift}" />
      </g>`;
  }

  const pathElements = paths
    .map(
      (d) =>
        `<path d="${d}" stroke="#0F172A" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"${dashAttr} />`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" class="w-full h-full select-none">${noiseMarkup}<g${groupTransform}>${pathElements}</g></svg>`;
}

/**
 * 内部辅助函数：生成视觉顺序记忆（SEQ）4~5 元素序列 SVG
 */
function buildSequentialSvg(sequenceTokens: string[]): string {
  const tokenMap: Record<string, (cx: number) => string> = {
    CIRCLE: (cx) => `<circle cx="${cx}" cy="80" r="14" stroke="#0F172A" stroke-width="3.2" fill="none" />`,
    TRIANGLE: (cx) => `<path d="M ${cx} 64 L ${cx + 15} 94 L ${cx - 15} 94 Z" stroke="#0F172A" stroke-width="3.2" fill="none" />`,
    SQUARE: (cx) => `<rect x="${cx - 13}" y="67" width="26" height="26" stroke="#0F172A" stroke-width="3.2" fill="none" />`,
    DIAMOND: (cx) => `<path d="M ${cx} 63 L ${cx + 15} 80 L ${cx} 97 L ${cx - 15} 80 Z" stroke="#0F172A" stroke-width="3.2" fill="none" />`,
    CROSS: (cx) => `<path d="M ${cx - 12} 80 L ${cx + 12} 80 M ${cx} 68 L ${cx} 92" stroke="#0F172A" stroke-width="3.2" />`,
  };
  const count = sequenceTokens.length;
  const step = 136 / count;
  const shapes = sequenceTokens
    .map((tok, idx) => {
      const cx = Math.round(18 + idx * step + step / 2);
      return (tokenMap[tok] || tokenMap.CIRCLE)(cx);
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" class="w-full h-full select-none">${shapes}</svg>`;
}

/**
 * 核心导出函数：动态生成 MVPT-4（第 1–45 题）与 TVPS-4（7 大子测验 × 18 题）参数化 SVG 4选1 题卡
 */
export function generatePerceptualSvgQuestionCard(params: {
  scaleCode: 'MVPT_4' | 'TVPS_4' | 'BEERY_VP';
  itemNumber: number; // MVPT_4 传 1~45；TVPS_4 传 1~18
  domainCode?: PerceptualDomainCode;
}): GeneratedPerceptualSvgCard {
  const { scaleCode, itemNumber } = params;

  // 若为 MVPT-4 且未显式指定 domainCode，按 MVPT-4 标准题册结构自动映射维度
  let domain: PerceptualDomainCode = params.domainCode || 'DIS';
  if (scaleCode === 'MVPT_4' && !params.domainCode) {
    if (itemNumber <= 9) domain = 'DIS';
    else if (itemNumber <= 18) domain = 'FGR';
    else if (itemNumber <= 27) domain = 'MEM';
    else if (itemNumber <= 36) domain = 'CLO';
    else domain = 'SPA';
  } else if (scaleCode === 'BEERY_VP') {
    domain = 'DIS';
  }

  const prim =
    PERCEPTUAL_SVG_PRIMITIVES[(itemNumber - 1) % PERCEPTUAL_SVG_PRIMITIVES.length];
  const fullTargetPaths = [...prim.outerPaths, ...prim.innerDetailPaths];
  const correctOptionIndex = ((itemNumber * 3 + 1) % 4) as 0 | 1 | 2 | 3;

  // 视觉顺序记忆 (SEQ) 单独构建序列题卡
  if (domain === 'SEQ') {
    const baseSeq =
      itemNumber % 2 === 1
        ? ['CIRCLE', 'TRIANGLE', 'SQUARE', 'DIAMOND']
        : ['TRIANGLE', 'CROSS', 'CIRCLE', 'SQUARE', 'DIAMOND'];
    const targetSvgMarkup = buildSequentialSvg(baseSeq);
    const d1 = [...baseSeq];
    [d1[1], d1[2]] = [d1[2], d1[1]];
    const d2 = [...baseSeq];
    [d2[0], d2[1]] = [d2[1], d2[0]];
    const d3 = [...baseSeq];
    [d3[baseSeq.length - 2], d3[baseSeq.length - 1]] = [
      d3[baseSeq.length - 1],
      d3[baseSeq.length - 2],
    ];

    const distractors = [
      { svg: buildSequentialSvg(d1), desc: '中部相邻元素顺序颠倒' },
      { svg: buildSequentialSvg(d2), desc: '首部两个元素顺序颠倒' },
      { svg: buildSequentialSvg(d3), desc: '尾部两个元素顺序颠倒' },
    ];
    const optionsSvgMarkup: [string, string, string, string] = ['', '', '', ''];
    const distractorAnalysis: [string, string, string, string] = ['', '', '', ''];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctOptionIndex) {
        optionsSvgMarkup[i] = targetSvgMarkup;
        distractorAnalysis[i] = '正确选项（序列100%一致）';
      } else {
        optionsSvgMarkup[i] = distractors[dIdx].svg;
        distractorAnalysis[i] = distractors[dIdx].desc;
        dIdx++;
      }
    }

    return {
      scaleCode,
      domainCode: 'SEQ',
      domainNameCn: '视觉顺序记忆（呈现5秒后遮挡）',
      itemNumber,
      exposureTimeSec: 5,
      promptText: '“请仔细看上面这一排图形的顺序 5 秒钟……（5秒后遮挡）现在请指出下面 A、B、C、D 哪一排顺序和刚才一模一样？”',
      targetSvgMarkup,
      optionsSvgMarkup,
      optionLabels: ['A', 'B', 'C', 'D'],
      correctOptionIndex,
      distractorAnalysis,
    };
  }

  // 构建顶栏目标图形 SVG
  const targetSvgMarkup = wrapSvgPaths(fullTargetPaths);

  // 根据 6 类非序列感知维度分别生成正确答案与 3 个高仿真同源干扰项
  let correctSvg = targetSvgMarkup;
  let distractors: Array<{ svg: string; desc: string }> = [];
  let domainNameCn = '视觉辨别';
  let exposureTimeSec: number | null = null;
  let promptText =
    '“请看上面这个图形，在下面 A、B、C、D 四个图形里，用手指指出哪一个和上面一模一样？”';

  switch (domain) {
    case 'DIS':
    case 'MEM': {
      domainNameCn =
        domain === 'MEM'
          ? '视觉记忆（呈现5秒后遮挡）'
          : `视觉辨别（${ prim.nameCn }）`;
      exposureTimeSec = domain === 'MEM' ? 5 : null;
      promptText =
        domain === 'MEM'
          ? '“请仔细看上面这个图形 5 秒钟并记住它……（满5秒遮挡）现在请在 A、B、C、D 里指出刚才看到的是哪一个？”'
          : '“请看上面这个图形，在下面 A、B、C、D 四个图形里，用手指指出哪一个和上面一模一样？”';
      correctSvg = wrapSvgPaths(fullTargetPaths);
      distractors = [
        {
          svg: wrapSvgPaths(prim.outerPaths), // 缺失内部细节特征线
          desc: '局部细节遗漏误差（缺失内部特征线/圆点）',
        },
        {
          svg: wrapSvgPaths([prim.distractorOuterPath, ...prim.innerDetailPaths]),
          desc: '外轮廓角度/边数微小失真干扰项',
        },
        {
          svg: wrapSvgPaths(fullTargetPaths, {
            transform: 'translate(160,0) scale(-1,1)',
          }),
          desc: '左右水平镜像翻转干扰项',
        },
      ];
      break;
    }

    case 'SPA': {
      domainNameCn = `空间关系（方向与旋转辨别 · ${prim.nameCn}）`;
      promptText =
        '“请看上面的目标图形，在下面 A、B、C、D 中找出方向、角度和细节位置完全一致的图形。”';
      correctSvg = wrapSvgPaths(fullTargetPaths);
      distractors = [
        {
          svg: wrapSvgPaths(fullTargetPaths, { transform: 'rotate(90 80 80)' }),
          desc: '顺时针旋转 90° 空间方向误差',
        },
        {
          svg: wrapSvgPaths(fullTargetPaths, {
            transform: 'translate(160,0) scale(-1,1)',
          }),
          desc: '水平镜像翻转（左右颠倒）误差',
        },
        {
          svg: wrapSvgPaths(fullTargetPaths, {
            transform: 'translate(0,160) scale(1,-1)',
          }),
          desc: '垂直倒置（上下颠倒）误差',
        },
      ];
      break;
    }

    case 'CON': {
      domainNameCn = `形式恒常性（缩放与旋转恒常识别 · ${prim.nameCn}）`;
      promptText =
        '“请看上面的目标图形，下面哪一个选项里包含形状本质完全一样的图形（即使它缩小或转了个角度）？”';
      correctSvg = wrapSvgPaths(fullTargetPaths, {
        transform: 'translate(80,80) scale(0.68) rotate(25) translate(-80,-80)',
      });
      distractors = [
        {
          svg: wrapSvgPaths([prim.distractorOuterPath], {
            transform: 'translate(80,80) scale(0.72) rotate(-20) translate(-80,-80)',
          }),
          desc: '近形拓扑改变干扰项（边角结构不同）',
        },
        {
          svg: wrapSvgPaths(prim.outerPaths, {
            transform: 'translate(80,80) scale(0.85, 0.52) translate(-80,-80)',
          }),
          desc: '长宽比例非等比拉伸失真干扰项',
        },
        {
          svg: wrapSvgPaths([prim.distractorOuterPath, ...prim.innerDetailPaths], {
            transform: 'translate(80,80) scale(0.68) rotate(110) translate(-80,-80)',
          }),
          desc: '外框顶角变异干扰项',
        },
      ];
      break;
    }

    case 'FGR': {
      domainNameCn = `图形-背景分离（复杂网格抗干扰提取 · ${prim.nameCn}）`;
      promptText =
        '“请看上面的图形，它藏在下面 A、B、C、D 哪一张复杂的网状背景图里？请把目标图形找出来。”';
      correctSvg = wrapSvgPaths(fullTargetPaths, {
        addFigureGroundNoise: true,
        noiseVariant: 1,
      });
      distractors = [
        {
          svg: wrapSvgPaths([prim.distractorOuterPath], {
            addFigureGroundNoise: true,
            noiseVariant: 2,
          }),
          desc: '复杂背景中混入近形多边形干扰项',
        },
        {
          svg: wrapSvgPaths(prim.outerPaths, {
            transform: 'rotate(90 80 80)',
            addFigureGroundNoise: true,
            noiseVariant: 0,
          }),
          desc: '复杂背景中图形发生 90° 旋转且缺失内部特征',
        },
        {
          svg: wrapSvgPaths([prim.distractorOuterPath, ...prim.innerDetailPaths], {
            transform: 'translate(160,0) scale(-1,1)',
            addFigureGroundNoise: true,
            noiseVariant: 3,
          }),
          desc: '复杂背景中镜像反转变形干扰项',
        },
      ];
      break;
    }

    case 'CLO': {
      domainNameCn = `视觉完型（断线轮廓脑内补全 · ${prim.nameCn}）`;
      promptText =
        '“如果把下面虚线断开的图形画完整（不能移动线条），哪一个会变成上面一模一样的完整图形？”';
      correctSvg = wrapSvgPaths(fullTargetPaths, { dashedClosure: true });
      distractors = [
        {
          svg: wrapSvgPaths([prim.distractorOuterPath, ...prim.innerDetailPaths], {
            dashedClosure: true,
          }),
          desc: '断线补全后外框顶点角度与原图不符',
        },
        {
          svg: wrapSvgPaths(prim.outerPaths, { dashedClosure: true }),
          desc: '断线补全后缺失内部关键结构线',
        },
        {
          svg: wrapSvgPaths(fullTargetPaths, {
            transform: 'translate(160,0) scale(-1,1)',
            dashedClosure: true,
          }),
          desc: '断线补全后呈左右镜像翻转',
        },
      ];
      break;
    }
  }

  const optionsSvgMarkup: [string, string, string, string] = ['', '', '', ''];
  const distractorAnalysis: [string, string, string, string] = ['', '', '', ''];
  let dIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i === correctOptionIndex) {
      optionsSvgMarkup[i] = correctSvg;
      distractorAnalysis[i] = '正确选项（目标匹配）';
    } else {
      optionsSvgMarkup[i] = distractors[dIdx].svg;
      distractorAnalysis[i] = distractors[dIdx].desc;
      dIdx++;
    }
  }

  return {
    scaleCode,
    domainCode: domain,
    domainNameCn,
    itemNumber,
    exposureTimeSec,
    promptText,
    targetSvgMarkup,
    optionsSvgMarkup,
    optionLabels: ['A', 'B', 'C', 'D'],
    correctOptionIndex,
    distractorAnalysis,
  };
}

// ============================================================================
// 九、 规则 R2 核心算法引擎：连续3题0分中止、查表换算与 L0–L5 自动定级纯函数
// ============================================================================

export interface CeilingCheckResult {
  shouldTerminate: boolean;
  consecutiveZeroCount: number;
  ceilingItemIndex: number | null;
  totalRawScore: number;
}

/**
 * 1. 电子量表连续 3 题 0 分自动中止检测器 (Ceiling Rule Engine)
 */
export function evaluateCeilingRule(
  itemScores: Array<0 | 1 | null>,
  ceilingThreshold = 3
): CeilingCheckResult {
  let consecutiveZeros = 0;
  let ceilingIndex: number | null = null;
  let rawScore = 0;

  for (let i = 0; i < itemScores.length; i++) {
    const s = itemScores[i];
    if (s === null || s === undefined) continue;
    if (s === 1) {
      rawScore += 1;
      consecutiveZeros = 0;
    } else {
      consecutiveZeros += 1;
      if (consecutiveZeros >= ceilingThreshold && ceilingIndex === null) {
        ceilingIndex = i + 1;
        break;
      }
    }
  }

  return {
    shouldTerminate: consecutiveZeros >= ceilingThreshold,
    consecutiveZeroCount: consecutiveZeros,
    ceilingItemIndex: ceilingIndex,
    totalRawScore: rawScore,
  };
}

/**
 * 2. Beery VMI-6 原始分 → 精确查表换算等效发展月龄、标准分 (Mean=100, SD=15) 与百分位
 */
export function calculateBeeryVmiNorms(
  rawScore: number,
  chronologicalAgeMonths: number,
  testType: 'vmiMain' | 'vpSupp' | 'mcSupp' = 'vmiMain'
): {
  rawScore: number;
  developmentalAgeMonths: number;
  developmentalAgeLabel: string;
  standardScore: number;
  percentileRank: number;
  clinicalClassification: '高于平均' | '平均水平' | '低于平均' | '显著落后' | '极重度落后';
} {
  const clampedRaw = Math.max(1, Math.min(30, Math.round(rawScore)));
  const matchedSpec =
    BEERY_VMI_6_ITEMS.find((it) => it.itemNumber === clampedRaw) ||
    BEERY_VMI_6_ITEMS[0];

  const ageAnchor =
    BEERY_AGE_NORM_MATRIX.find(
      (row) =>
        chronologicalAgeMonths >= row.ageMonthsMin &&
        chronologicalAgeMonths <= row.ageMonthsMax
    ) ||
    (Number.isFinite(chronologicalAgeMonths) &&
    chronologicalAgeMonths < BEERY_AGE_NORM_MATRIX[0].ageMonthsMin
      ? BEERY_AGE_NORM_MATRIX[0]
      : BEERY_AGE_NORM_MATRIX[BEERY_AGE_NORM_MATRIX.length - 1]);

  const expectedMeanRaw = ageAnchor.expectedRawScoreMean100[testType];
  const zScore = (clampedRaw - expectedMeanRaw) / ageAnchor.rawScorePer15StdPoints;
  const standardScore = Math.max(45, Math.min(145, Math.round(100 + zScore * 15)));

  const percentileRank = Math.max(
    1,
    Math.min(99, Math.round(50 * (1 + Math.tanh(zScore * 0.79788))))
  );

  let clinicalClassification: '高于平均' | '平均水平' | '低于平均' | '显著落后' | '极重度落后' = '平均水平';
  if (standardScore >= 110) clinicalClassification = '高于平均';
  else if (standardScore >= 90) clinicalClassification = '平均水平';
  else if (standardScore >= 80) clinicalClassification = '低于平均';
  else if (standardScore >= 70) clinicalClassification = '显著落后';
  else clinicalClassification = '极重度落后';

  return {
    rawScore: clampedRaw,
    developmentalAgeMonths: matchedSpec.developmentalAgeMonths,
    developmentalAgeLabel: matchedSpec.developmentalAgeLabel,
    standardScore,
    percentileRank,
    clinicalClassification,
  };
}

/**
 * 3. TVPS-4 七大子测验原始分 (0–18) → 量表分 Scaled Score (1–19, Mean=10, SD=3) 与综合标准分换算器
 */
export function calculateTvps4ProfileNorms(
  subtestRawScores: Record<PerceptualDomainCode, number>,
  chronologicalAgeYears: number
): {
  scaledScores: Record<PerceptualDomainCode, number>;
  overallStandardScore: number;
  overallPercentile: number;
  weakestSubtests: Array<{ code: string; nameCn: string; scaledScore: number; matchedSopCards: string[] }>;
} {
  const clampedAge = Math.max(5, Math.min(18, Math.floor(chronologicalAgeYears)));
  const ageNormRow =
    TVPS_4_AGE_NORM_MATRIX.find(
      (row) => clampedAge >= row.ageYearsMin && clampedAge <= row.ageYearsMax
    ) || TVPS_4_AGE_NORM_MATRIX[TVPS_4_AGE_NORM_MATRIX.length - 1];

  const scaledScores = {} as Record<PerceptualDomainCode, number>;
  let sumScaled = 0;

  (Object.keys(subtestRawScores) as PerceptualDomainCode[]).forEach((key) => {
    const raw = Math.max(0, Math.min(18, subtestRawScores[key]));
    const expectedMeanForSubtest = ageNormRow.expectedSubtestRawMean10[key] ?? 10;
    const z = (raw - expectedMeanForSubtest) / ageNormRow.rawPer3ScaledPoints;
    const scaled = Math.max(1, Math.min(19, Math.round(10 + z * 3)));
    scaledScores[key] = scaled;
    sumScaled += scaled;
  });

  const overallZ = (sumScaled - 70) / 12.5;
  const overallStandardScore = Math.max(45, Math.min(145, Math.round(100 + overallZ * 15)));
  const overallPercentile = Math.max(
    1,
    Math.min(99, Math.round(50 * (1 + Math.tanh(overallZ * 0.79788))))
  );

  const weakestSubtests = TVPS_4_SUBTESTS.map((spec) => ({
    code: spec.subtestCode,
    nameCn: spec.nameCn,
    scaledScore: scaledScores[spec.subtestCode],
    matchedSopCards: spec.matchedSopCards,
  }))
    .filter((item) => item.scaledScore <= 7)
    .sort((a, b) => a.scaledScore - b.scaledScore);

  return {
    scaledScores,
    overallStandardScore,
    overallPercentile,
    weakestSubtests,
  };
}

/**
 * 3.5 MVPT-4 (45题统一标准版) 原始分 → 标准分 (Mean=100, SD=15)、百分位与薄弱维度解析器
 */
export function calculateMvpt4Norms(params: {
  rawScore: number;
  chronologicalAgeYears: number;
  itemScores45?: Array<0 | 1>; // 若传入 MVPT-4 逐题得分(长度45)，自动分析5大维度哪一项错题最多
}): {
  scaleCode: 'MVPT_4';
  rawScore: number;
  maxPossibleRaw: 45;
  standardScore: number | null;
  percentileRank: number | null;
  ageEquivalentLabel: string;
  normApplied: boolean;
  normNote: string;
  weakestDomains: Array<{ domainCode: string; domainNameCn: string; accuracyPct: number; matchedSopCards: string[] }>;
} {
  const clampedRaw = Math.max(0, Math.min(45, Math.round(params.rawScore)));
  const ageYears = Math.floor(params.chronologicalAgeYears);
  const normRow = MVPT_4_SCALE_SPEC.ageNormTable45Items.find((r) => r.ageYears === ageYears);
  const normApplied =
    Number.isFinite(ageYears) && ageYears >= 4 && ageYears <= 13 && normRow !== undefined;

  const zScore = normRow ? (clampedRaw - normRow.expectedMeanRaw) / normRow.sdRaw : 0;
  const standardScore =
    normApplied && normRow
      ? Math.max(45, Math.min(145, Math.round(100 + zScore * 15)))
      : null;
  const percentileRank =
    normApplied && normRow
      ? Math.max(1, Math.min(99, Math.round(50 * (1 + Math.tanh(zScore * 0.79788)))))
      : null;

  const matchedEqRow =
    normApplied && normRow
      ? MVPT_4_SCALE_SPEC.ageNormTable45Items.find((r) => clampedRaw <= r.expectedMeanRaw + 2) ||
        MVPT_4_SCALE_SPEC.ageNormTable45Items[MVPT_4_SCALE_SPEC.ageNormTable45Items.length - 1]
      : undefined;

  const weakestDomains: Array<{
    domainCode: string;
    domainNameCn: string;
    accuracyPct: number;
    matchedSopCards: string[];
  }> = [];

  if (params.itemScores45 && params.itemScores45.length > 0) {
    MVPT_4_SCALE_SPEC.domainSections.forEach((sec) => {
      const hits = sec.itemNumbers.reduce((acc, qNum) => {
        const val = params.itemScores45?.[qNum - 1];
        return acc + (val === 1 ? 1 : 0);
      }, 0);
      const pct = Math.round((hits / sec.itemNumbers.length) * 100);
      if (pct < 65) {
        weakestDomains.push({
          domainCode: sec.domainCode,
          domainNameCn: sec.domainNameCn,
          accuracyPct: pct,
          matchedSopCards: sec.matchedSopCards,
        });
      }
    });
    weakestDomains.sort((a, b) => a.accuracyPct - b.accuracyPct);
  }

  return {
    scaleCode: 'MVPT_4',
    rawScore: clampedRaw,
    maxPossibleRaw: 45,
    standardScore,
    percentileRank,
    ageEquivalentLabel:
      normApplied && matchedEqRow ? matchedEqRow.ageEquivalentLabel : '未计算（需手册常模）',
    normApplied,
    normNote: normApplied
      ? '内置 4–13 岁参考锚点，正式标准分以手册为准'
      : ageYears < 4
        ? '低于 4 岁常模下限，请录入手册标准分'
        : '超出内置常模表（4–13 岁），请录入手册标准分',
    weakestDomains,
  };
}

/**
 * 4. DEM 发育性眼动测验计算器（自动计算修正横时、纵横比与 I~IV 分型）
 */
export function evaluateDemTestResult(params: {
  ageYears: number;
  testAVerticalSec: number;
  testBVerticalSec: number;
  testCHorizontalRawSec: number;
  omissionErrors: number;   // 漏读字数 (o)
  additionErrors: number;   // 多读/增字数 (a)
}): {
  verticalTotalSec: number;
  horizontalAdjustedSec: number;
  demRatio: number;
  behaviorType: DemClinicalBehaviorType;
  summaryText: string;
} {
  const verticalTotalSec = Number(
    (params.testAVerticalSec + params.testBVerticalSec).toFixed(1)
  );
  const denominator = Math.max(40, 80 - params.omissionErrors + params.additionErrors);
  const horizontalAdjustedSec = Number(
    (params.testCHorizontalRawSec * (80 / denominator)).toFixed(1)
  );
  const demRatio = Number((horizontalAdjustedSec / Math.max(10, verticalTotalSec)).toFixed(2));

  const clampedAge = Math.max(6, Math.min(13, Math.floor(params.ageYears)));
  const norm =
    DEM_AGE_NORMS_TABLE.find((r) => r.ageYears === clampedAge) ||
    DEM_AGE_NORMS_TABLE[2];

  const isVerticalSlow = verticalTotalSec > norm.expectedVerticalSecMean * 1.25;
  const isRatioHigh = demRatio >= norm.abnormalRatioCutoff;

  let behaviorType: DemClinicalBehaviorType = 'TYPE_I_NORMAL';
  let summaryText = `DEM 纵横比 ${demRatio}（同龄截断值 ${norm.abnormalRatioCutoff}），按行扫视与自动命名均处于正常范围。`;

  if (!isVerticalSlow && isRatioHigh) {
    behaviorType = 'TYPE_II_OCULOMOTOR_DYSFUNCTION';
    summaryText = `DEM 呈典型【II型：眼动扫视障碍】（纵横比 ${demRatio} ≥ ${norm.abnormalRatioCutoff}，漏读 ${params.omissionErrors} 处），提示跨行与按行扫视控制薄弱，建议优先强化 L1 平滑追踪/扫视与 L2 图形-背景按行寻宝。`;
  } else if (isVerticalSlow && !isRatioHigh) {
    behaviorType = 'TYPE_III_AUTOMATICITY_PROBLEM';
    summaryText = `DEM 呈【III型：自动命名提取缓慢】（纵时 ${verticalTotalSec}s 偏慢，但纵横比 ${demRatio} 正常），提示视觉到语言自动化提取效率低，建议加测 RAN/RAS 并配合 L4 认读训练。`;
  } else if (isVerticalSlow && isRatioHigh) {
    behaviorType = 'TYPE_IV_COMBINED_DEFICIT';
    summaryText = `DEM 呈【IV型：眼动扫视与命名自动性双重不足】（纵时 ${verticalTotalSec}s，纵横比 ${demRatio}），建议从 L1 眼动控制与基础视觉辨别同步切入。`;
  }

  return {
    verticalTotalSec,
    horizontalAdjustedSec,
    demRatio,
    behaviorType,
    summaryText,
  };
}

/**
 * 5. 综合定级引擎（严格遵循原方案 3.6 节与 SRS 规则 R2：统一支持 TVPS-4 或 MVPT-4 无运动视觉感知标准分输入）
 */
export interface ComprehensiveGradingInput {
  isRedZonePositive: boolean;
  isReferralAuditedPass: boolean;
  quadrupedHoldSec: number;
  spsrcSensoryStable: boolean;
  npcBreakCm: number;
  accomFacilityCpm: number;
  nsucoMinScore: 1 | 2 | 3 | 4 | 5;
  tvpsOverallStdScore?: number;       // TVPS-4 综合标准分（与 mvpt4StdScore 二选一或同时传入）
  mvpt4StdScore?: number;             // MVPT-4 综合标准分（Mean=100, SD=15）
  tvpsWeakestSubtest?: PerceptualDomainCode;
  beeryVmiStdScore: number;
  beeryVpStdScore?: number;
  beeryMcStdScore?: number;
  classroomCopyAccuracyPct?: number;
}

export interface ComprehensiveGradingOutput {
  triageStatus: 'RED_ZONE_LOCKED' | 'GREEN_ACTIVE';
  recommendedLevel: VmiCapabilityLevel;
  recommendedLevelLabel: string;
  clinicalBottleneckAnalysis: string;
  radarSixDimensions: [number, number, number, number, number, number];
  recommendedSopCardCodes: string[];
}

export function determineRecommendedLevelL0ToL5(
  input: ComprehensiveGradingInput
): ComprehensiveGradingOutput {
  const measuredMotorFreeScores = [input.tvpsOverallStdScore, input.mvpt4StdScore].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  const motorFreePerceptionStd =
    measuredMotorFreeScores.length > 0
      ? Math.min(...measuredMotorFreeScores)
      : (input.beeryVpStdScore ?? 85);
  const motorFreeSource =
    input.tvpsOverallStdScore !== undefined && input.mvpt4StdScore !== undefined
      ? 'TVPS-4/MVPT-4 取较低值'
      : input.tvpsOverallStdScore !== undefined
        ? 'TVPS-4'
        : input.mvpt4StdScore !== undefined
          ? 'MVPT-4'
          : input.beeryVpStdScore !== undefined
            ? 'Beery VP 参考分'
            : '未施测（参考值）';
  const weakestHint = input.tvpsWeakestSubtest
    ? `；TVPS-4 最弱子测验 ${input.tvpsWeakestSubtest}`
    : '';

  const l0Score = Math.min(95, Math.max(30, Math.round(input.quadrupedHoldSec * 6 + (input.spsrcSensoryStable ? 35 : 10))));
  const l1Score = Math.min(
    95,
    Math.max(
      25,
      Math.round(
        100 -
          Math.max(0, input.npcBreakCm - 6) * 5 -
          Math.max(0, 10 - input.accomFacilityCpm) * 4 +
          (input.nsucoMinScore - 3) * 8
      )
    )
  );
  const l2Score = Math.min(95, Math.max(25, Math.round((motorFreePerceptionStd - 50) * 1.1)));
  const l3Score = Math.min(95, Math.max(25, Math.round((input.beeryVmiStdScore - 50) * 1.1)));
  const l4Score = input.classroomCopyAccuracyPct ?? Math.round((l2Score + l3Score) * 0.45);
  const l5Score = Math.round((l0Score + l3Score + l4Score) / 3);

  const radarSixDimensions: [number, number, number, number, number, number] = [
    l0Score,
    l1Score,
    l2Score,
    l3Score,
    l4Score,
    l5Score,
  ];

  if (input.isRedZonePositive && !input.isReferralAuditedPass) {
    return {
      triageStatus: 'RED_ZONE_LOCKED',
      recommendedLevel: 'L0',
      recommendedLevelLabel: '红区熔断锁定（仅开放 L0 非视觉负荷感统活动）',
      clinicalBottleneckAnalysis:
        '初筛发现眼科红区指征且尚未完成眼科专科回执核验，系统已强制阻断高负荷视觉训练，请先转介小儿眼科处置。',
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 1-1', '操作卡 1-3'],
    };
  }

  if (!input.spsrcSensoryStable || input.quadrupedHoldSec < 5) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L0',
      recommendedLevelLabel: 'L0 身体准备阶段（感统与近端姿势稳定）',
      clinicalBottleneckAnalysis:
        '四点支撑维持不足或前庭-本体姿势控制未稳，导致坐姿歪斜与眼球追视缺乏颈部稳定支撑，需遵循“先稳定身体近端，再练眼动与手部精细”原则。',
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 1-1', '操作卡 1-2', '操作卡 1-3'],
    };
  }

  if (input.npcBreakCm > 10 || input.accomFacilityCpm < 6 || input.nsucoMinScore <= 2) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L1',
      recommendedLevelLabel: 'L1 视觉效率阶段（眼动追踪/调节/双眼聚散）',
      clinicalBottleneckAnalysis: `存在明显视觉效率瓶颈（集合近点 NPC=${input.npcBreakCm}cm、翻转拍=${input.accomFacilityCpm}cpm、NSUCO=${input.nsucoMinScore}分），属于底层“眼球采集不稳”，需优先开展聚散球与平滑追踪训练。`,
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 2-1', '操作卡 2-2', '操作卡 2-3'],
    };
  }

  const mcStd = input.beeryMcStdScore ?? input.beeryVmiStdScore;
  if (motorFreePerceptionStd < 80 && motorFreePerceptionStd <= mcStd) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L2',
      recommendedLevelLabel: 'L2 视觉感知阶段（图形-背景/空间位置/视觉记忆）',
      clinicalBottleneckAnalysis: `无运动视觉感知得分（${motorFreeSource} ${motorFreePerceptionStd}）显著低于手部运动协调表现${weakestHint}，属于典型“看不准（复杂背景提取与空间编码弱）”，重点开展图形-背景分离与几何空间训练。`,
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 3-1', '操作卡 3-2', '操作卡 3-3'],
    };
  }

  if (input.beeryVmiStdScore < 80 || (input.beeryMcStdScore !== undefined && input.beeryMcStdScore < 80)) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L3',
      recommendedLevelLabel: 'L3 视觉运动整合阶段（手眼协调/精细操作/图形临摹）',
      clinicalBottleneckAnalysis: `视觉感知尚可，但 Beery VMI-6 标准分（${input.beeryVmiStdScore}分）或运动协调补充测验偏低，属于“看得到但手部精细控制与眼手同步差”，重点开展镊子夹珠、分级串珠与点连线临摹。`,
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 4-1', '操作卡 4-2', '操作卡 4-3'],
    };
  }

  if (input.beeryVmiStdScore < 90 || (input.classroomCopyAccuracyPct !== undefined && input.classroomCopyAccuracyPct < 85)) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L4',
      recommendedLevelLabel: 'L4 适应应用阶段（看黑板远近抄写与文具协同）',
      clinicalBottleneckAnalysis:
        '基础视觉感知与图形临摹已达标，当前主要困难在于真实课堂环境下的远近焦点切换抄写速度与尺子/剪刀双侧工具使用。',
      radarSixDimensions,
      recommendedSopCardCodes: ['操作卡 4-3', '操作卡 5-1'],
    };
  }

  return {
    triageStatus: 'GREEN_ACTIVE',
    recommendedLevel: 'L5',
    recommendedLevelLabel: 'L5 生活迁移阶段（居家自理与社区自然情境泛化）',
    clinicalBottleneckAnalysis:
      '各项视觉效率与视觉运动整合指标均达常模平均水平，重点巩固穿衣扣纽扣、系鞋带、整理书包与超市按清单寻物等社区独立生活技能。',
    radarSixDimensions,
    recommendedSopCardCodes: ['操作卡 5-1'],
  };
}