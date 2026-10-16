export const TRAINING_TOPIC_NAMES = {
  probability:'概率', expectation:'期望', coding:'编程', statistics:'统计', combinatorics:'组合数学',
  regression:'回归', optimization:'优化', 'options-pricing':'期权定价', 'game-theory':'博弈论', finance:'金融',
  'machine-learning':'机器学习', 'linear-algebra':'线性代数', 'time-series':'时间序列', 'brain-teaser':'逻辑与脑筋题',
  'random-variables':'随机变量', 'market-microstructure':'市场微观结构', 'stochastic-process':'随机过程',
};
export const trainingTopicName = id => TRAINING_TOPIC_NAMES[id] || id;
