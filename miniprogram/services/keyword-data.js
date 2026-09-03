'use strict'

/**
 * 岗位技能词库（M2 JD 关键词比对）。
 *
 * 六个方向的常用技能词 + 同义词表，全部为**开发时写死的预设内容**。
 * 关键词比对是纯字符串匹配，不调用任何模型 API。
 *
 * 新增方向 / 词条时：
 * - 保持每个方向的词条量在 60-120，太多会误命中（"AI" 到处出现）
 * - 同义词只收敛「缩写 → 全称」这类明确映射，不做模糊联想
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const DICTIONARY = {
  backend: {
    label: '后端开发',
    words: [
      'java', 'spring', 'spring boot', 'spring boot', 'spring cloud', 'mybatis',
      'mysql', 'redis', 'kafka', 'rabbitmq', '消息队列', '微服务', '分布式',
      'jvm', '多线程', '高并发', 'docker', 'kubernetes', 'k8s', 'linux',
      'nginx', 'elasticsearch', 'mongodb', 'postgresql', 'zookeeper', 'dubbo',
      'grpc', 'rpc', 'netty', 'tomcat', '性能优化', '数据库设计', '索引优化',
      '事务', '缓存', '分布式锁', '限流', '熔断', '幂等', 'python', 'go',
      'golang', 'c++', 'rust', 'serverless', '单元测试', '接口设计', '架构设计',
      '大模型', 'rag', '向量数据库', '微服务拆分', '服务治理', '容器化', 'ci/cd',
    ],
  },
  frontend: {
    label: '前端开发',
    words: [
      'javascript', 'typescript', 'vue', 'vue3', 'react', 'redux', 'webpack',
      'vite', 'node', 'node.js', 'html', 'css', 'sass', '小程序', '微信小程序',
      'uniapp', 'taro', '微前端', 'ssr', 'spa', 'http', 'https', '浏览器',
      '渲染性能', '组件化', 'echarts', 'canvas', 'webgl', '前端工程化', 'bff',
      'graphql', 'websocket', 'pwa', '移动端', '响应式', '骨架屏', '打包',
      '构建', 'es6', 'eslint', 'jest', '自动化测试', '用户体验', '埋点',
      '性能监控', '状态管理', '路由', '请求库', 'vconsole', '浏览器兼容',
    ],
  },
  algorithm: {
    label: '算法 / 机器学习',
    words: [
      '机器学习', '深度学习', 'python', 'pytorch', 'tensorflow',
      'transformer', '大模型', 'llm', 'nlp', '计算机视觉', 'cv', '推荐系统',
      '强化学习', '数据分析', '特征工程', '模型训练', '模型部署', 'a/b测试',
      '排序算法', '数据结构', '动态规划', '图算法', '搜索算法', '时间复杂度',
      '空间复杂度', 'c++', 'rag', '微调', 'prompt', '智能体', 'agent',
      '向量检索', '知识图谱', '语音识别', 'asr', '目标检测', '图像分类',
      '多模态', '预训练', '蒸馏', '量化', 'onnx', 'tensorrt', 'huggingface',
    ],
  },
  data: {
    label: '数据 / 分析',
    words: [
      'sql', 'mysql', 'python', 'pandas', 'numpy', 'spark', 'hadoop', 'hive',
      'flink', 'kafka', '数据仓库', '数据湖', 'etl', '数据分析', '数据可视化',
      'bi', 'tableau', 'powerbi', '指标体系', '用户画像', 'a/b测试', '埋点',
      '增长分析', 'sql优化', 'hbase', 'clickhouse', 'doris', '数据治理',
      '数据建模', '报表', '维度建模', '离线数仓', '实时数仓', '数据质量',
      '数据血缘', '数据同步', '调度', 'airflow', '数据产品', '经营分析',
    ],
  },
  product: {
    label: '产品经理',
    words: [
      '需求分析', 'prd', '原型', 'axure', 'figma', '用户调研', '竞品分析',
      '数据分析', 'a/b测试', '用户增长', '用户画像', '产品规划', '版本管理',
      '敏捷', 'scrum', '项目管理', 'roadmap', '优先级', 'mvp', '用户故事',
      '体验设计', '留存', '转化率', '商业化', '数据驱动', '跨部门协作',
      '业务流程', '产品设计', '灰度发布', '埋点', '增长黑客', '付费转化',
      '召回', 'push', '触达', '权益', '活动', '定价', '供给侧', '需求侧',
    ],
  },
  operation: {
    label: '运营',
    words: [
      '用户运营', '内容运营', '活动运营', '渠道运营', '增长', '拉新', '留存',
      '转化', 'gmv', 'dau', 'mau', '社群', '新媒体', '公众号', '小红书',
      '抖音', '快手', '微博', 'seo', 'sem', '投放', '预算', 'roi', '数据分析',
      '用户画像', '营销', '策划', '品牌', '活动策划', 'kol', '私域', '直播',
      '电商', '会员体系', '积分', '裂变', '补贴', '复盘', '北极星指标',
      '用户分层', '触达', 'push', '推送', '内容策划', '脚本', '剪辑', '排版',
    ],
  },
}

/** 同义词映射：别名 → 主词（提取时归一） */
const SYNONYM_MAP = {
  'k8s': 'kubernetes',
  'js': 'javascript',
  'go': 'golang',
  'springboot': 'spring boot',
  'es': 'elasticsearch',
  'mq': '消息队列',
  'ml': '机器学习',
  'cv': '计算机视觉',
  'ai': '大模型',
  '算法岗': '算法',
}

/** 提取时先归一化，别名统一到主词 */
function canonicalize(word) {
  const w = String(word || '').toLowerCase().trim()
  return SYNONYM_MAP[w] || w
}

/** 反向索引：主词 → [主词, 别名...]，供匹配时同时检查主词与别名 */
function buildAliasIndex() {
  const idx = {}
  for (const alias in SYNONYM_MAP) {
    const canon = SYNONYM_MAP[alias]
    if (!idx[canon]) idx[canon] = [canon]
    idx[canon].push(alias)
  }
  return idx
}

const ALIAS_INDEX = buildAliasIndex()

/** 某主词的所有匹配变体（含自身） */
function variantsOf(canonical) {
  return ALIAS_INDEX[canonical] || [canonical]
}

/** 方向 key 列表 */
function directions() {
  return Object.keys(DICTIONARY).map(function (k) {
    return { key: k, label: DICTIONARY[k].label }
  })
}

/** 某方向去重后的主词列表（按词库顺序） */
function directionWords(direction) {
  const dict = DICTIONARY[direction] || DICTIONARY.backend
  const seen = {}
  const out = []
  for (let i = 0; i < dict.words.length; i++) {
    const c = canonicalize(dict.words[i])
    if (!seen[c]) {
      seen[c] = true
      out.push(c)
    }
  }
  return out
}

module.exports = {
  DICTIONARY: DICTIONARY,
  SYNONYM_MAP: SYNONYM_MAP,
  ALIAS_INDEX: ALIAS_INDEX,
  canonicalize: canonicalize,
  variantsOf: variantsOf,
  directions: directions,
  directionWords: directionWords,
}
