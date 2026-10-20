/**
 * 星眸智康 VMI-TIS — 孤独症学生视觉运动整合训练干预系统
 * 评估子系统全量量表题库、SVG刺激矩阵、临床视光常模与 L0–L5 自动定级算法种子字典 (V2.0 全量完整版)
 *
 * 编制依据：《孤独症学生视觉运动整合训练干预系统整体设计方案（池霞团队方法体系）》第二章 & 第三章
 *
 * 工程存放路径建议（对应您的 VMI-TIS 根目录截图）：
 *   1. 主存放路径：`VMI-TIS/packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`
 *      并在 `VMI-TIS/packages/shared-types/src/index.ts` 中添加：
 *      `export * from './vmi_tis_assessment_scales_seed';`
 *   2. 数据库灌入路径：在 `VMI-TIS/prisma/seed.ts` 中直接 import 本文件常量，一键写入 SQLite / PostgreSQL。
 */

// ============================================================================
// 一、 核心类型与枚举定义 (Shared Types & Enums)
// ============================================================================

export type VmiCapabilityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export type AssessmentTier =
  | 'TIER_1_SCREENING'   // 第一层：初筛问卷、0-6岁发育里程碑与眼科红区预警
  | 'TIER_2_OPTOMETRY'   // 第二层：视觉通路与视觉效率专科检查（调节/聚散/双眼视/NSUCO）
  | 'TIER_3_SCALES'      // 第三层：8大标准化功能评估量表（Beery VMI-6 / TVPS-4 / MVPT-3 / DEM / TVMS-3 / RAN / SPSRC）
  | 'TIER_4_PROCESS';    // 第四层：60Hz眼动仪客观指标与课堂10回合过程评估

export type ScaleCode =
  | 'BEERY_VMI_6'        // 视觉运动整合发育测验（第6版：主测验30题 + VP视觉感知补充30题 + MC运动协调补充30题）
  | 'TVPS_4'             // 视觉感知能力测试（第4版：7大无运动视觉感知子测验 × 18题）
  | 'MVPT_3'             // 无运动视觉感知测验（第3版：4-8岁或低配合度快速指认）
  | 'DEM'                // 发育性眼动测验（≥6岁 Test A/B 纵向认读 + Test C 横向扫视 80数字矩阵）
  | 'NSUCO'              // 东北部州立大学视光学院眼动标准化观察量表（注视/追视/扫视 1-5分）
  | 'TVMS_3'             // 视觉运动技能测试（第3版：线条、角度、闭合与比例6维误差分析）
  | 'RAN_RAS'            // 快速自动命名与快速交替刺激测验（5×10 颜色/数字/物体/字母矩阵）
  | 'SPSRC_SIPT';        // 感觉处理与自我调节检核表 / 感觉统合与运用能力测验（L0底座筛查）

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
    redFlagWhenAbsent: '幼小衔接期抄写严重出格、跳行漏字，需系统评估 Beery VMI-6 与 DEM',
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
// 五、 第三层量表 2 & 3：TVPS-4（7大子测验电子题卡与常模） & MVPT-3（无运动感知）
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
  subtestCode: 'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO';
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
        promptText: '下面四个图形中，有三个朝向是一样的，请指出哪一个图形的方向和其它三个不一样？',
        exposureTimeSec: null,
        targetShapeDesc: '找出唯一发生镜像翻转的 L 型折线',
        optionsDesc: ['标准正向 L 型箭头', '标准正向 L 型箭头', '水平镜像翻转的 L 型箭头(正确)', '标准正向 L 型箭头'],
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
        promptText: '请看上面的小梯形，下面哪一个图里藏着形状完全一样的梯形（即使它变大、变小或转了个弯）？',
        exposureTimeSec: null,
        targetShapeDesc: '等腰梯形（底角60°）',
        optionsDesc: ['缩小50%且旋转90°的等腰梯形(正确)', '平行四边形', '直角梯形', '不规则六边形'],
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
        promptText: '请看上面的五边形，它藏在下面哪一张复杂的网状背景图里？请用手指指出来。',
        exposureTimeSec: null,
        targetShapeDesc: '隐藏在波浪网格线中的正五边形',
        optionsDesc: ['仅含圆弧与三角的网格', '含隐藏正五边形的网格(正确)', '含隐藏正方形的网格', '纯平行斜线网格'],
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
        promptText: '如果把下面虚线断开的图形连完整，哪一个会变成上面一模一样的六角星？',
        exposureTimeSec: null,
        targetShapeDesc: '完整六角星 vs 缺失一半边线的断续轮廓',
        optionsDesc: ['补全后为五角星的断线图', '补全后为八边形的断线图', '补全后为六角星的断线图(正确)', '补全后为菱形的断线图'],
        correctOptionIndex: 2,
      },
    ],
  },
];

/**
 * 5.2 MVPT-3（无运动视觉感知测验·第3版）配置与常模说明（适合 4–8 岁低龄或低配合孤独症学生）
 */
export const MVPT_3_SCALE_SPEC = {
  scaleCode: 'MVPT_3',
  nameCn: 'MVPT-3 无运动视觉感知测验（第3版）',
  applicableAgeYears: '4–8岁（短表 1–40 题，无需任何书写动作）',
  sections: [
    { range: '第 1–8 题', category: '空间关系与方向辨别（Spatial Relationship）' },
    { range: '第 9–16 题', category: '视觉辨别与图形细节（Visual Discrimination）' },
    { range: '第 17–24 题', category: '图形-背景分离（Figure-Ground）' },
    { range: '第 25–32 题', category: '视觉完型补全（Visual Closure）' },
    { range: '第 33–40 题', category: '视觉短时记忆（Visual Memory，呈现5秒后翻页指认）' },
  ],
  expectedRawScoreByAge: [
    { ageYears: 4, meanRaw: 14, sdRaw: 4.0 },
    { ageYears: 5, meanRaw: 19, sdRaw: 4.2 },
    { ageYears: 6, meanRaw: 24, sdRaw: 4.5 },
    { ageYears: 7, meanRaw: 28, sdRaw: 4.5 },
    { ageYears: 8, meanRaw: 32, sdRaw: 4.2 },
  ],
};

// ============================================================================
// 六、 第三层量表 4：DEM 发育性眼动测验（含完整 Test A / Test B / Test C 80数字刺激矩阵）
// ============================================================================

/**
 * 6.1 DEM 电子施测标准数字刺激矩阵（Test A 纵列40数字 + Test B 纵列40数字 + Test C 16行×5列共80横向不规则间距数字）
 */
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

/**
 * 7.1 TVMS-3 视觉运动技能测试（第3版）6大图形临摹失真误差分类计分字典
 */
export const TVMS_3_ERROR_CATEGORIES = [
  { code: 'ERR_CLOSURE', nameCn: '线条闭合误差（Closure Error）', desc: '图形交界处存在 >3mm 缺口或过度出头交叉' },
  { code: 'ERR_ANGLE', nameCn: '角度失真误差（Angle Error）', desc: '直角/锐角被画成圆弧角，或角度偏差 >20°' },
  { code: 'ERR_INTERSECTION', nameCn: '线条交集误差（Intersection Error）', desc: '应交于一点的多条线错位分离，或相切图形发生穿透' },
  { code: 'ERR_LINE_QUALITY', nameCn: '线质与运笔控制误差（Line Quality）', desc: '线条剧烈抖动、反复描摹接笔或折返断线' },
  { code: 'ERR_LENGTH_RATIO', nameCn: '长短比例失调（Length & Proportion）', desc: '图形长宽比或组件大小比例偏离范图 >30%' },
  { code: 'ERR_ROTATION_SPACE', nameCn: '空间旋转与边界偏离（Rotation & Spatial）', desc: '图形整体倾斜旋转 >20° 或严重偏离作答框中心' },
];

/**
 * 7.2 RAN / RAS 快速自动命名与快速交替刺激测验（5行×10列共50项标准矩阵与常模）
 */
export const RAN_RAS_SCALE_CONFIG = {
  subtests: [
    { code: 'RAN_COLORS', nameCn: '颜色快速命名', stimuliPool: ['红', '黄', '蓝', '绿', '黑'] },
    { code: 'RAN_NUMBERS', nameCn: '数字快速命名', stimuliPool: ['2', '4', '6', '7', '9'] },
    { code: 'RAN_OBJECTS', nameCn: '常见物体快速命名', stimuliPool: ['手', '书', '狗', '星', '树'] },
    { code: 'RAS_2_SET', nameCn: '数字-颜色快速交替命名', stimuliPool: ['红', '2', '蓝', '7', '绿', '4', '黄', '9'] },
  ],
  /** 5–12岁完成 50 项快速命名正常耗时上限（秒）：超时提示视觉-语言自动化提取落后 */
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

/**
 * 7.3 SPSRC 感觉处理与自我调节检核表 / L0 身体准备阶段核心筛查条目
 */
export const SPSRC_L0_SENSORY_CHECKLIST = [
  { code: 'L0_CHK_01', category: '抗重力与躯干核心稳定', item: '四点支撑（手膝跪位抬头看前方）维持时间不足 5 秒即塌腰或低头', weight: 2 },
  { code: 'L0_CHK_02', category: '坐姿维持与近端稳定', item: '桌前端坐不足 3 分钟即滑下椅子、趴在桌面或必须用手撑头才能视物', weight: 2 },
  { code: 'L0_CHK_03', category: '前庭觉与头部抗重力', item: '俯卧滑板抬头推球困难，或身体轻微晃动/旋转后视线长时间无法聚焦', weight: 2 },
  { code: 'L0_CHK_04', category: '本体觉与上肢力量调节', item: '握笔或抓握教具时力度极端（捏断笔尖或握不住频繁掉落），手腕无法贴稳桌面', weight: 1 },
  { code: 'L0_CHK_05', category: '双侧整合与跨中线', item: '右手无法自然跨过身体中线去拿左侧物品，画横线到中线处必须换手或挪动身体', weight: 1 },
  { code: 'L0_CHK_06', category: '生理唤醒度调节', item: '进入训练室常处于极度兴奋跑跳或极度倦怠低唤醒状态，无法直接进入桌面视觉任务', weight: 2 },
];

// ============================================================================
// 八、 规则 R2 核心算法引擎：连续3题0分中止、查表换算与 L0–L5 自动定级纯函数
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

  // 从 BEERY_AGE_NORM_MATRIX 查找对应实足月龄锚点
  const ageAnchor =
    BEERY_AGE_NORM_MATRIX.find(
      (row) =>
        chronologicalAgeMonths >= row.ageMonthsMin &&
        chronologicalAgeMonths <= row.ageMonthsMax
    ) || BEERY_AGE_NORM_MATRIX[BEERY_AGE_NORM_MATRIX.length - 1];

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
  subtestRawScores: Record<'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO', number>,
  chronologicalAgeYears: number
): {
  scaledScores: Record<'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO', number>;
  overallStandardScore: number;
  overallPercentile: number;
  weakestSubtests: Array<{ code: string; nameCn: string; scaledScore: number; matchedSopCards: string[] }>;
} {
  const clampedAge = Math.max(5, Math.min(18, Math.floor(chronologicalAgeYears)));
  // 同龄期望原始分均值随年龄从 5岁(约7题) 递增至 14岁+(约14.5题)
  const expectedRawMean = Math.min(14.5, 6.5 + (clampedAge - 5) * 0.85);
  const rawSd = 2.4;

  const scaledScores = {} as Record<'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO', number>;
  let sumScaled = 0;

  (Object.keys(subtestRawScores) as Array<'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO'>).forEach((key) => {
    const raw = Math.max(0, Math.min(18, subtestRawScores[key]));
    const z = (raw - expectedRawMean) / rawSd;
    const scaled = Math.max(1, Math.min(19, Math.round(10 + z * 3)));
    scaledScores[key] = scaled;
    sumScaled += scaled;
  });

  // 7个子测验量表分之和（均值 70，标准差约 12.5）换算为综合标准分 (Mean=100, SD=15)
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
    .filter((item) => item.scaledScore <= 7) // 量表分 ≤ 7（对应标准分 < 85）视为显著感知短板
    .sort((a, b) => a.scaledScore - b.scaledScore);

  return {
    scaledScores,
    overallStandardScore,
    overallPercentile,
    weakestSubtests,
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
  // DEM 标准修正公式：Adjusted Horizontal Time = Raw Time × [80 / (80 - o + a)]
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
 * 5. 综合定级引擎（严格遵循原方案 3.6 节与 SRS 规则 R2：输出 L0–L5 定级、六维雷达向量与推荐操作卡）
 */
export interface ComprehensiveGradingInput {
  isRedZonePositive: boolean;
  isReferralAuditedPass: boolean;
  quadrupedHoldSec: number;
  spsrcSensoryStable: boolean;
  npcBreakCm: number;
  accomFacilityCpm: number;
  nsucoMinScore: 1 | 2 | 3 | 4 | 5;
  tvpsOverallStdScore: number;
  tvpsWeakestSubtest?: 'DIS' | 'MEM' | 'SPA' | 'CON' | 'SEQ' | 'FGR' | 'CLO';
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
  const l2Score = Math.min(95, Math.max(25, Math.round((input.tvpsOverallStdScore - 50) * 1.1)));
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

  const vpStd = input.beeryVpStdScore ?? input.tvpsOverallStdScore;
  const mcStd = input.beeryMcStdScore ?? input.beeryVmiStdScore;
  if (input.tvpsOverallStdScore < 80 && vpStd <= mcStd) {
    return {
      triageStatus: 'GREEN_ACTIVE',
      recommendedLevel: 'L2',
      recommendedLevelLabel: 'L2 视觉感知阶段（图形-背景/空间位置/视觉记忆）',
      clinicalBottleneckAnalysis: `无运动视觉感知得分（TVPS-4 标准分 ${input.tvpsOverallStdScore}）显著低于手部运动协调表现，属于典型“看不准（复杂背景提取与空间编码弱）”，重点开展图形-背景分离与几何空间训练。`,
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