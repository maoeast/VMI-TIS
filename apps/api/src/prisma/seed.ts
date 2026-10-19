/**
 * VMI-TIS Seed 脚本：13 张标准化操作卡 + 6 名示例学生
 *
 * 数据来源：
 * - 卡片基础字段（code/mod/level/title/aid/cue/desc）迁移自
 *   docs/vmi_tis_prototype.html L1847-1861（LIB_CARDS，13 张）。
 * - 学生基础字段迁移自 docs/vmi_tis_prototype.html L1741-1844（STUDENT_DB，6 名）。
 * - targetSkill / procedureStepsJson / passCriteria / digitalGameMode / parentTaskJson
 *   原型未提供，按卡片 title/desc/cue 与需求文档 R1-R4 的临床语义补写；
 *   cardCode 按契约规范化为 Mx-x-x。
 * - birthDate 由原型年龄字符串按 2026-10 基准反推，属演示数据。
 *
 * 契约：prisma/schema.prisma（SopCard / Student）。
 * 执行：npm run db:seed（幂等 upsert，可重复运行）。
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '../config/database.config';

loadEnv({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: { url: getDatabaseUrl() },
  },
});

const json = (value: unknown): string => JSON.stringify(value);

interface SeedSopCard {
  cardCode: string;
  cardLevel: string;
  moduleName: string;
  cardTitle: string;
  targetSkill: string;
  materialsJson: string;
  procedureStepsJson: string;
  passCriteria: string;
  digitalGameMode: 'bubble' | 'brock' | 'star' | null;
  parentTaskJson: string;
  cueTextJson: string;
}

interface SeedStudent {
  studentCode: string;
  name: string;
  gender: string;
  birthDate: Date;
  schoolScene: string;
  currentLevel: string;
  triageStatus: string;
  promotionStatus: string;
  primaryTherapistId: string;
  parentPhone: string;
  chiefComplaint: string;
}

const SOP_CARDS: SeedSopCard[] = [
  {
    cardCode: 'M1-1-1',
    cardLevel: 'L0',
    moduleName: 'M1 身体稳定与感统',
    cardTitle: '四点支撑（躯干与近端稳定）',
    targetSkill: '躯干伸展 · 肩胛稳定 · 近端控制',
    materialsJson: json(['通用软垫/地垫']),
    procedureStepsJson: json([
      '学生俯卧，手肘伸直并垂直于肩，膝盖垂直于髋，进入四点支撑。',
      '治疗师示范并口令提示“头抬起，眼睛看前面”。',
      '保持 10 秒；逐步加入单肢抬起与对侧手脚伸展。',
      '每回合记录保持秒数及塌腰、耸肩等代偿动作。',
    ]),
    passCriteria: '连续 3 次课，4/5 回合独立保持 10 秒且无明显代偿',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '地板四点支撑',
      instruction: '在客厅软垫上完成 3 组四点支撑，每组保持 10 秒，家长数数并记录。',
    }),
    cueTextJson: json([
      '头抬起，眼睛看前面',
      '手肘伸直，膝盖垂直于髋',
      '保持住——10、9、8……',
    ]),
  },
  {
    cardCode: 'M1-1-2',
    cardLevel: 'L0',
    moduleName: 'M1 身体稳定与感统',
    cardTitle: '花样滑板（前庭眼反射与手眼协调）',
    targetSkill: '前庭眼反射 · 俯卧伸展 · 手眼协调',
    materialsJson: json(['滑板', '大小球', '长绳']),
    procedureStepsJson: json([
      '学生俯卧于滑板，抬头目视前方，双手撑地滑行。',
      '治疗师在 2m 外与学生面对面推球，学生抬头接球并推回。',
      '加入蹬墙滑行与绕障碍拉绳前进。',
      '每回合记录抬头持续时间、推接球成功次数与眩晕反应。',
    ]),
    passCriteria: '连续 3 次课，8/10 回合抬头推球并接住，无明显眩晕抗拒',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '地板爬行推球',
      instruction: '在家中客厅铺设软垫，让孩子四点爬行并推动软球至对面墙壁，往返 6 次。',
    }),
    cueTextJson: json([
      '趴在滑板上，头抬高看老师的球',
      '双手用力把球推过来',
      '保持抬头，不要低头',
    ]),
  },
  {
    cardCode: 'M1-1-3',
    cardLevel: 'L0',
    moduleName: 'M1 身体稳定与感统',
    cardTitle: '沙包游戏（身体图式与双侧分化）',
    targetSkill: '身体图式 · 跨中线 · 双侧分化',
    materialsJson: json(['4色沙包']),
    procedureStepsJson: json([
      '学生仰卧，手心与脚背各放一个沙包，听指令移动对应肢体。',
      '立位进行跨中线抛接，左右手交替。',
      '头顶沙包沿直线平衡走 3m。',
      '每回合记录指令正确次数与沙包掉落次数。',
    ]),
    passCriteria: '连续 3 次课，10 次指令中 8 次正确移动对应肢体',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '沙包指令游戏',
      instruction: '家长说出“右手/左脚”等指令，孩子移动对应肢体上的沙包，每次 5 分钟。',
    }),
    cueTextJson: json([
      '把右手沙包尽量向头部移动',
      '同时把右脚沙包向右侧移动',
      '头顶沙包，慢慢走直线',
    ]),
  },
  {
    cardCode: 'M2-2-1',
    cardLevel: 'L1',
    moduleName: 'M2 视觉效率与双眼视',
    cardTitle: '聚散球 Brock 线（集合/散开与生理复视）',
    targetSkill: '集合与散开 · 生理复视 · 双眼单视',
    materialsJson: json(['2号教具：聚散球（红绿黄三球绳）']),
    procedureStepsJson: json([
      '将球绳一端固定于鼻尖前，红球置于 30cm、绿球 60cm、黄球 90cm。',
      '依次注视红、绿、黄球各 5 秒，保持单视并观察生理复视。',
      '红球每次移近 5cm，递进至鼻尖前 2.5cm。',
      '出现复视或模糊时回到上一个清晰点，稳定后再前进。',
    ]),
    passCriteria: '连续 3 次课，红球移近至 ≤5cm 且保持单视，8/10 回合',
    digitalGameMode: 'brock',
    parentTaskJson: json({
      taskName: '聚散球家庭练习',
      instruction: '每日 5 分钟，按红-绿-黄顺序注视，每个球保持 5 秒单视，家长记录最接近距离。',
    }),
    cueTextJson: json([
      '眼睛看着红球',
      '用余光感觉其他两个球',
      '看清楚，保持单视',
    ]),
  },
  {
    cardCode: 'M2-2-2',
    cardLevel: 'L1',
    moduleName: 'M2 视觉效率与双眼视',
    cardTitle: '戳泡泡（平滑追踪与眼-头分离）',
    targetSkill: '平滑追踪 · 眼-头分离 · 视觉注意',
    materialsJson: json(['吹泡圈', '一体机戳泡泡软件']),
    procedureStepsJson: json([
      '治疗师控制泡泡向上下左右多方向缓慢移动。',
      '学生头部保持不动，仅用眼睛跟随泡泡。',
      '听到“戳”的指令后伸手戳破泡泡。',
      '每回合记录 30 秒内戳破数量与头位偏移次数。',
    ]),
    passCriteria: '连续 3 次课，30 秒内戳破 ≥8 个泡泡，头位偏移 ≤2 次',
    digitalGameMode: 'bubble',
    parentTaskJson: json({
      taskName: '追视泡泡',
      instruction: '家长吹泡泡，孩子头不动、眼睛跟随，听到“戳”再戳破，每次 5 分钟。',
    }),
    cueTextJson: json([
      '头不动，眼睛跟着泡泡走',
      '等我说“戳”再戳',
      '眼睛看，手先不动',
    ]),
  },
  {
    cardCode: 'M2-2-3',
    cardLevel: 'L1',
    moduleName: 'M2 视觉效率与双眼视',
    cardTitle: '手指伙伴 / 变焦球 / 勺子托球',
    targetSkill: '调节灵活度 · 远近焦点转换 · 手眼协调',
    materialsJson: json(['笑脸贴纸', '变焦球绳筒', '塑料勺乒乓球']),
    procedureStepsJson: json([
      '将笑脸贴纸贴在指尖，2m 外缓慢移动，学生注视并用手指触碰。',
      '使用变焦球绳筒，交替注视近端与远端球体。',
      '勺子托乒乓球，在远近不同目标间移动并保持球不落。',
      '每回合记录远近切换后看清所需时间与掉落次数。',
    ]),
    passCriteria: '连续 3 次课，远近切换 10 次中 8 次在 3 秒内看清',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '勺子托球',
      instruction: '孩子用勺子托住乒乓球，从客厅一端走到另一端，途中注视家长举起的手指，往返 5 次。',
    }),
    cueTextJson: json([
      '眼睛看着笑脸，慢慢移动触碰',
      '看近——看远，快速切换',
      '手稳，眼睛先看清',
    ]),
  },
  {
    cardCode: 'M3-3-1',
    cardLevel: 'L2',
    moduleName: 'M3 视觉感知',
    cardTitle: '图形-背景识别（目标分离与按行扫描）',
    targetSkill: '图形-背景分离 · 按行扫描 · 目标定位',
    materialsJson: json(['12号视觉认知卡', '数字串', '混放珠子']),
    procedureStepsJson: json([
      '在重叠图卡中按从左到右、从上到下的顺序找出指定图形。',
      '在多位数字串中圈出目标数字（如 69）。',
      '从混放彩珠中分离指定颜色与形状。',
      '在洗衣机衣物或生活场景中找出指定物品。',
    ]),
    passCriteria: '连续 3 次课，每张卡 4/5 个目标在 60 秒内找齐',
    digitalGameMode: 'star',
    parentTaskJson: json({
      taskName: '找袜子',
      instruction: '在整理好的衣物堆中按颜色找出指定袜子，每次 10 双，家长计时。',
    }),
    cueTextJson: json([
      '从左往右一行一行看',
      '把所有的☆涂成黄色',
      '圈出数字 69',
    ]),
  },
  {
    cardCode: 'M3-3-2',
    cardLevel: 'L2',
    moduleName: 'M3 视觉感知',
    cardTitle: '视觉记忆与顺序（工作记忆再现）',
    targetSkill: '视觉记忆 · 序列再现 · 抗干扰',
    materialsJson: json(['视觉记忆卡', '序列图卡', '遮挡板']),
    procedureStepsJson: json([
      '呈现 5 个图案或物品，学生注视 5 秒。',
      '用遮挡板盖住，学生按原顺序摆出。',
      '进阶为正序、逆序再现颜色与形状序列。',
      '加入干扰卡后完成配对与回忆。',
    ]),
    passCriteria: '连续 3 次课，5 项序列 4/5 正确',
    digitalGameMode: 'star',
    parentTaskJson: json({
      taskName: '记忆卡片',
      instruction: '摆出 4 张卡片让孩子看 5 秒，盖住后按顺序复述或摆出，每次 10 轮。',
    }),
    cueTextJson: json([
      '仔细看这张图并记住顺序',
      '现在盖住了，请按顺序摆出来',
      '先看，再摆，不要急',
    ]),
  },
  {
    cardCode: 'M3-3-3',
    cardLevel: 'L2',
    moduleName: 'M3 视觉感知',
    cardTitle: '视觉空间与完型（网格定位与图形补全）',
    targetSkill: '空间方位 · 网格定位 · 图形完型',
    materialsJson: json(['9号亚克力几何地标+皮筋', '3×3网格图']),
    procedureStepsJson: json([
      '按“上/下/左/右/B2”等方位词指认网格位置。',
      '在指定格子里画出与左图相同的三角形。',
      '补全不完整图形，并用皮筋在地标上还原。',
      '每回合记录定位正确次数与图形闭合质量。',
    ]),
    passCriteria: '连续 3 次课，8/10 次网格定位正确，图形可辨认',
    digitalGameMode: 'star',
    parentTaskJson: json({
      taskName: '网格画图',
      instruction: '家长说“B2 画三角形”等指令，孩子在 3×3 网格中完成，每次 10 题。',
    }),
    cueTextJson: json([
      '在右边的 B2 格子里画三角形',
      '先找横排，再找竖列',
      '把缺的边补完整',
    ]),
  },
  {
    cardCode: 'M4-4-1',
    cardLevel: 'L3',
    moduleName: 'M4 视觉运动整合',
    cardTitle: '小小设计师（镊子夹珠精准摆图）',
    targetSkill: '前三指力量 · 精细夹取 · 视觉-动作整合',
    materialsJson: json(['儿童安全镊子', '彩色珠子', '分级图案卡']),
    procedureStepsJson: json([
      '手腕贴稳桌面，用前三指握住镊子。',
      '夹起珠子，按图案卡逐颗摆放。',
      '先摆直线，再摆几何图形，要求珠子紧挨无空隙。',
      '记录完成时间、掉落次数与图案还原度。',
    ]),
    passCriteria: '连续 3 次课，3 分钟内摆放 20 颗珠子，间隙 ≤1mm',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '夹珠子',
      instruction: '用儿童镊子把 20 颗珠子按颜色摆成一条直线，家长计时并记录掉落次数。',
    }),
    cueTextJson: json([
      '手腕贴稳桌面',
      '用镊子夹住珠子',
      '一个挨着一个照着图摆整齐',
    ]),
  },
  {
    cardCode: 'M4-4-2',
    cardLevel: 'L3',
    moduleName: 'M4 视觉运动整合',
    cardTitle: '分级孔径串珠 / 几何木棍插板',
    targetSkill: '双手协调 · 精细抓握 · 形状与高度匹配',
    materialsJson: json(['10号串珠（2~0.25cm）', '11号木棍插板']),
    procedureStepsJson: json([
      '从大孔珠+鞋带开始，一手拿绳、一手穿珠。',
      '逐步过渡到 0.25cm 小珠+鱼线。',
      '按颜色、形状、高度三维特征将木棍插入对应孔位。',
      '记录穿珠数量、掉落次数与插板正确率。',
    ]),
    passCriteria: '连续 3 次课，2 分钟内穿 10 颗小珠，插板 8/10 正确',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '穿珠与插棍',
      instruction: '每天穿 10 颗珠子并完成 10 次木棍插板，家长记录用时与正确数。',
    }),
    cueTextJson: json([
      '一手拿稳绳子，一手把珠子穿进去',
      '找到一样形状高矮的孔',
      '慢慢来，对准再插',
    ]),
  },
  {
    cardCode: 'M4-4-3',
    cardLevel: 'L3',
    moduleName: 'M4 视觉运动整合',
    cardTitle: '手内操作 / 追踪线条 / 点连线与模仿画',
    targetSkill: '手内操作 · 通道描线 · 图形临摹',
    materialsJson: json(['硬币', '8号追踪簿', '12号模仿画卡']),
    procedureStepsJson: json([
      '单手掌心到指尖移动硬币，不借助另一只手。',
      '沿通道描线，尽量不出界。',
      '按 1→7 顺序完成数字点阵连线。',
      '按发育顺序临摹几何图形（圆、十字、方形、三角形、菱形）。',
    ]),
    passCriteria: '连续 3 次课，描线出界 ≤2 次，临摹 4/5 图形可辨认',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '点连线与描线',
      instruction: '完成一页点连线和一页通道描线，家长检查是否出界，每次 10 分钟。',
    }),
    cueTextJson: json([
      '把硬币从掌心移到指尖',
      '从 1 开始顺着点连到 7',
      '照着样子画，先看再动笔',
    ]),
  },
  {
    cardCode: 'M5-5-1',
    cardLevel: 'L5',
    moduleName: 'M5 应用与生活迁移',
    cardTitle: '课堂看黑板抄写、文具使用与居家社区自理',
    targetSkill: '远近焦点切换 · 文具操作 · 生活自理 · 社区参与',
    materialsJson: json(['真实衣物（纽扣/拉链）', '文具包', '视觉步骤图']),
    procedureStepsJson: json([
      '抬头看黑板红框中的字，记住后在田字格中写下。',
      '练习扣纽扣、拉拉链、系鞋带。',
      '使用直尺画线、用剪刀沿轮廓剪裁。',
      '按购物清单在模拟超市中取物并结账。',
    ]),
    passCriteria: '连续 3 次课，课堂抄写任务 2/3 独立完成，生活任务 4/5 步骤独立',
    digitalGameMode: null,
    parentTaskJson: json({
      taskName: '居家自理清单',
      instruction: '每日完成穿衣、整理书包、按清单取物三项任务，家长用视觉步骤图提示并记录独立完成情况。',
    }),
    cueTextJson: json([
      '先抬头看黑板红框里的字',
      '记在脑子里，低头在田字格写下来',
      '一步一步照着图做',
    ]),
  },
];

const SEED_STUDENTS: SeedStudent[] = [
  {
    studentCode: 'VMI-2026001',
    name: '林小宇',
    gender: '男',
    birthDate: new Date('2018-03-15T00:00:00.000Z'),
    schoolScene: '特教二年级 (1) 班',
    currentLevel: 'L2',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'PROMOTION_READY',
    primaryTherapistId: 'therapist_zhou_min',
    parentPhone: '138****5678',
    chiefComplaint: '注意力分散，抄写慢且错漏多；Beery VMI 76 分，TVPS 图形背景短板',
  },
  {
    studentCode: 'VMI-2026002',
    name: '陈果果',
    gender: '女',
    birthDate: new Date('2020-08-12T00:00:00.000Z'),
    schoolScene: '学龄前融合班',
    currentLevel: 'L1',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'IN_PROGRESS',
    primaryTherapistId: 'therapist_zhou_min',
    parentPhone: '139****2468',
    chiefComplaint: '集合不足 NPC 14cm，双面镜 4cpm，近距离阅读易疲劳',
  },
  {
    studentCode: 'VMI-2026003',
    name: '张梓轩',
    gender: '男',
    birthDate: new Date('2015-06-08T00:00:00.000Z'),
    schoolScene: '普通小学资源教室',
    currentLevel: 'L1',
    triageStatus: 'RED_ZONE_LOCKED',
    promotionStatus: 'IN_PROGRESS',
    primaryTherapistId: 'therapist_chen_ming',
    parentPhone: '137****1357',
    chiefComplaint: '右眼屈光参差 + 外隐斜 18△，已转介妇幼眼科',
  },
  {
    studentCode: 'VMI-2026004',
    name: '王梓涵',
    gender: '女',
    birthDate: new Date('2021-06-20T00:00:00.000Z'),
    schoolScene: '学前感统干预组',
    currentLevel: 'L0',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'IN_PROGRESS',
    primaryTherapistId: 'therapist_liu_yang',
    parentPhone: '136****8021',
    chiefComplaint: '四点支撑不足 5 秒，前庭眼反射弱，注视短暂',
  },
  {
    studentCode: 'VMI-2026005',
    name: '刘诺一',
    gender: '男',
    birthDate: new Date('2017-02-18T00:00:00.000Z'),
    schoolScene: '特教三年级 (2) 班',
    currentLevel: 'L3',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'PROMOTION_READY',
    primaryTherapistId: 'therapist_zhou_min',
    parentPhone: '135****6688',
    chiefComplaint: 'Beery VMI 79 分，手眼协调与精细夹珠训练中',
  },
  {
    studentCode: 'VMI-2026006',
    name: '周子墨',
    gender: '男',
    birthDate: new Date('2014-04-05T00:00:00.000Z'),
    schoolScene: '融合教育五年级',
    currentLevel: 'L4',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'IN_PROGRESS',
    primaryTherapistId: 'therapist_li_teacher',
    parentPhone: '134****9902',
    chiefComplaint: '看黑板远近切换抄写慢，尺子剪刀协同练习中',
  },
];

async function seedSopCards(): Promise<void> {
  for (const card of SOP_CARDS) {
    const { cardCode, ...cardData } = card;
    await prisma.sopCard.upsert({
      where: { cardCode },
      update: cardData,
      create: card,
    });
  }
}

async function seedStudents(): Promise<void> {
  for (const student of SEED_STUDENTS) {
    const { studentCode, ...studentData } = student;
    await prisma.student.upsert({
      where: { studentCode },
      update: studentData,
      create: student,
    });
  }
}

async function main(): Promise<void> {
  console.log(`[seed] database = ${getDatabaseUrl()}`);
  await seedSopCards();
  await seedStudents();

  const [cardCount, studentCount] = await Promise.all([
    prisma.sopCard.count(),
    prisma.student.count(),
  ]);

  console.log(`[seed] sop_cards = ${cardCount}, students = ${studentCount}`);
  if (cardCount !== SOP_CARDS.length || studentCount !== SEED_STUDENTS.length) {
    throw new Error(
      `Seed 数量不符：期望 sop_cards=${SOP_CARDS.length}, students=${SEED_STUDENTS.length}；` +
        `实际 sop_cards=${cardCount}, students=${studentCount}`,
    );
  }
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
