import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/hull-derivatives/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/hull-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-hull-repair-2026-06-02";

const repairs = [
  {
    id: "hull-derivatives-problem-004",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 1.4. 假设你卖出一份看跌期权合约，执行价格为 40 美元，到期日为 3 个月后。当前股票价格为 41 美元，该合约对应 100 股股票。你承诺了什么？你可能获得或损失多少？",
      explanationZh: "1.4\n你卖出了一份看跌期权。若合约另一方选择行权、以每股 40 美元卖出股票，你同意以每股 40 美元买入 100 股。只有当股票价格低于 40 美元时期权才会被行使。例如，若股票价格为 30 美元时行权，你必须以每股 40 美元买入价值 30 美元的股票；每股亏损 10 美元，总亏损 1,000 美元。若股票价格为 20 美元时行权，你每股亏损 20 美元，总亏损 2,000 美元。最坏情况下，三个月内股价几乎跌至零，这种极不可能的情况会使你损失约 4,000 美元。作为补偿，你从买方那里收取期权费。"
    }
  },
  {
    id: "hull-derivatives-problem-005",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 1.5. 你希望投机某只股票价格上涨。当前股价为 29 美元，一份执行价格为 30 美元、期限为 3 个月的看涨期权价格为 2.90 美元。你有 5,800 美元可投资。请给出两种可选投资策略：一种投资股票，另一种投资该股票期权。两种策略各自的潜在收益和损失是什么？",
      explanation: "1.5\nOne strategy is to buy 200 shares. Another is to buy 2,000 call options. If the share price rises substantially, the option strategy gives larger gains because it is leveraged. For example, if the share price rises to USD 40, the option strategy gains 2,000 * (40 - 30) - 5,800 = USD 14,200, while the stock strategy gains 200 * (40 - 29) = USD 2,200. If the share price falls, the option strategy gives larger losses. For example, if the share price falls to USD 25, the stock strategy loses 200 * (29 - 25) = USD 800, while the option strategy loses the entire USD 5,800 investment. This illustrates the built-in leverage in options.",
      explanationEn: "1.5\nOne strategy is to buy 200 shares. Another is to buy 2,000 call options. If the share price rises substantially, the option strategy gives larger gains because it is leveraged. For example, if the share price rises to USD 40, the option strategy gains 2,000 * (40 - 30) - 5,800 = USD 14,200, while the stock strategy gains 200 * (40 - 29) = USD 2,200. If the share price falls, the option strategy gives larger losses. For example, if the share price falls to USD 25, the stock strategy loses 200 * (29 - 25) = USD 800, while the option strategy loses the entire USD 5,800 investment. This illustrates the built-in leverage in options."
    }
  },
  {
    id: "hull-derivatives-problem-027",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 1.27. 交易者 A 签订一份远期合约，约定一年后以 1,000 美元买入一项资产。交易者 B 购买一份看涨期权，获得一年后以 1,000 美元买入该资产的权利，期权成本为 100 美元。两位交易者的头寸有什么区别？请画出或说明一年后两位交易者的利润如何随资产价格变化。"
    }
  },
  {
    id: "hull-derivatives-problem-030",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 1.30. 某股票价格为 29 美元。交易者买入一份该股票的看涨期权合约，执行价格为 30 美元，同时卖出一份同一股票的看涨期权合约，执行价格为 32.50 美元。两份期权的市场价格分别为 2.75 美元和 1.50 美元，且到期日相同。请描述该交易者的头寸。"
    }
  },
  {
    id: "hull-derivatives-problem-035",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 2.1. 假设你签订一份空头期货合约，以每盎司 17.20 美元的价格卖出 7 月交割的白银。合约规模为 5,000 盎司，初始保证金为 4,000 美元，维持保证金为 3,000 美元。期货价格发生多大变化会导致追加保证金通知？如果你未能满足追加保证金要求，会发生什么？"
    }
  },
  {
    id: "hull-derivatives-problem-037",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 2.3. 以 2 美元价格触发的止损卖出订单是什么意思？它通常在什么情况下使用？以 2 美元限价卖出的订单是什么意思？它通常在什么情况下使用？"
    }
  },
  {
    id: "hull-derivatives-problem-160",
    reason: "Official answer text was OCR-garbled in both languages, obscuring accrued interest and futures quote calculations.",
    fields: {
      explanation: [
        "6.21",
        "The quoted bond price is 137. Since the last coupon date was March 1 and the next coupon date is September 1, there are 184 days in the coupon period and 9 days of accrued interest on March 10. The accrued interest is 4 * 9 / 184 = 0.1957, so the current cash bond price is 137.1957.",
        "A coupon of 4 will be received on September 1, after 175 days or 0.4795 years. Its present value is 4 * exp(-0.05 * 0.4795) = 3.9053. The futures contract lasts 296 days, or 0.8110 years. If the futures contract were written directly on the 8% bond, the cash futures price would be (137.1957 - 3.9053) * exp(0.05 * 0.8110) = 138.8061.",
        "At delivery on December 31, there are 121 days of accrued interest since September 1 in a 181-day coupon period. The accrued interest is 4 * 121 / 181 = 2.6740. The quoted futures price for the 8% bond is therefore 138.8061 - 2.6740 = 136.1321.",
        "Finally divide by the conversion factor: 136.1321 / 1.2191 = 111.66. The quoted futures price for the contract is therefore about 111.66."
      ].join("\n\n"),
      explanationEn: [
        "6.21",
        "The quoted bond price is 137. Since the last coupon date was March 1 and the next coupon date is September 1, there are 184 days in the coupon period and 9 days of accrued interest on March 10. The accrued interest is 4 * 9 / 184 = 0.1957, so the current cash bond price is 137.1957.",
        "A coupon of 4 will be received on September 1, after 175 days or 0.4795 years. Its present value is 4 * exp(-0.05 * 0.4795) = 3.9053. The futures contract lasts 296 days, or 0.8110 years. If the futures contract were written directly on the 8% bond, the cash futures price would be (137.1957 - 3.9053) * exp(0.05 * 0.8110) = 138.8061.",
        "At delivery on December 31, there are 121 days of accrued interest since September 1 in a 181-day coupon period. The accrued interest is 4 * 121 / 181 = 2.6740. The quoted futures price for the 8% bond is therefore 138.8061 - 2.6740 = 136.1321.",
        "Finally divide by the conversion factor: 136.1321 / 1.2191 = 111.66. The quoted futures price for the contract is therefore about 111.66."
      ].join("\n\n"),
      explanationZh: [
        "6.21",
        "债券当前报价为 137。上一个付息日为 3 月 1 日，下一个付息日为 9 月 1 日，整个付息期有 184 天；3 月 10 日时已经累计 9 天应计利息。因此应计利息为 4 * 9 / 184 = 0.1957，当前现金债券价格为 137.1957。",
        "9 月 1 日将收到一笔 4 的息票，距离当前 175 天，即 0.4795 年。该息票现值为 4 * exp(-0.05 * 0.4795) = 3.9053。期货合约期限为 296 天，即 0.8110 年。如果期货直接写在这只 8% 息票债券上，则现金期货价格为 (137.1957 - 3.9053) * exp(0.05 * 0.8110) = 138.8061。",
        "12 月 31 日交割时，距离 9 月 1 日已有 121 天应计利息，9 月 1 日到下一付息日的付息期为 181 天，因此应计利息为 4 * 121 / 181 = 2.6740。于是该 8% 债券对应的期货报价为 138.8061 - 2.6740 = 136.1321。",
        "最后除以转换因子：136.1321 / 1.2191 = 111.66。因此该期货合约的报价约为 111.66。"
      ].join("\n\n")
    }
  },
  {
    id: "hull-derivatives-problem-215",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 10.9. 交易者买入一份执行价格为 45 美元的看涨期权，并买入一份执行价格为 40 美元的看跌期权。两份期权具有相同的到期日。看涨期权价格为 3 美元，看跌期权价格为 4 美元。请画出交易者利润随资产价格变化的图。",
      explanation: "10.9\nLet S_T be the asset price at maturity. The total option cost is USD 7. If S_T < 40, the put payoff is 40 - S_T and the call payoff is zero, so profit is 33 - S_T. If 40 <= S_T <= 45, neither option pays off, so profit is -7. If S_T > 45, the call payoff is S_T - 45 and the put payoff is zero, so profit is S_T - 52. The trader profits when S_T < 33 or S_T > 52. This strategy is a strangle.",
      explanationEn: "10.9\nLet S_T be the asset price at maturity. The total option cost is USD 7. If S_T < 40, the put payoff is 40 - S_T and the call payoff is zero, so profit is 33 - S_T. If 40 <= S_T <= 45, neither option pays off, so profit is -7. If S_T > 45, the call payoff is S_T - 45 and the put payoff is zero, so profit is S_T - 52. The trader profits when S_T < 33 or S_T > 52. This strategy is a strangle.",
      explanationZh: "10.9\n设 S_T 为到期时资产价格。两份期权总成本为 7 美元。若 S_T < 40，看跌期权回报为 40 - S_T，看涨期权无回报，因此利润为 33 - S_T。若 40 <= S_T <= 45，两份期权均无回报，利润为 -7。若 S_T > 45，看涨期权回报为 S_T - 45，看跌期权无回报，因此利润为 S_T - 52。交易者在 S_T < 33 或 S_T > 52 时获利。该策略称为宽跨式组合（strangle）。"
    }
  },
  {
    id: "hull-derivatives-problem-234",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 11.6. 一只不支付股息的股票价格为 19 美元，该股票执行价格为 20 美元、期限为 3 个月的欧式看涨期权价格为 1 美元。无风险利率为年化 4%。执行价格为 20 美元、期限为 3 个月的欧式看跌期权价格是多少？",
      explanation: "11.6\nHere c=1, T=0.25, S_0=19, K=20, and r=0.04. Put-call parity gives p = c + K exp(-rT) - S_0. Therefore p = 1 + 20 exp(-0.04 * 0.25) - 19 = 1.80. The European put price is USD 1.80.",
      explanationEn: "11.6\nHere c=1, T=0.25, S_0=19, K=20, and r=0.04. Put-call parity gives p = c + K exp(-rT) - S_0. Therefore p = 1 + 20 exp(-0.04 * 0.25) - 19 = 1.80. The European put price is USD 1.80."
    }
  },
  {
    id: "hull-derivatives-problem-321",
    reason: "Chinese prompt mixed untranslated English fragments and the Chinese solution ended with inconsistent equivalent formulas.",
    fields: {
      promptEn: "Practice 15.10. Consider a derivative that pays off S_T^n at time T, where S_T is the stock price at that time. When the stock pays no dividends and its price follows geometric Brownian motion, it can be shown that its price at time t, where t < T, has the form h(t,T)S^n, where S is the stock price at time t and h is a function only of t and T. (a) By substituting into the Black-Scholes-Merton partial differential equation, derive an ordinary differential equation satisfied by h(t,T). (b) What is the boundary condition for the differential equation for h(t,T)? (c) Show that h(t,T) = exp{[0.5 sigma^2 n(n-1) + r(n-1)](T-t)}, where r is the risk-free interest rate and sigma is the stock price volatility.",
      promptZh: "问题 15.10. 考虑一个在时间 T 支付 S_T^n 的衍生品，其中 S_T 为时间 T 的股票价格。当股票不支付股息且价格服从几何布朗运动时，可以证明其在时间 t（t < T）的价格具有 h(t,T) S^n 的形式，其中 S 是时间 t 的股票价格，h 仅是 t 和 T 的函数。(a) 将该形式代入 Black-Scholes-Merton 偏微分方程，推导 h(t,T) 满足的常微分方程。(b) h(t,T) 的边界条件是什么？(c) 证明 h(t,T) = exp{[0.5 sigma^2 n(n-1) + r(n-1)](T-t)}，其中 r 为无风险利率，sigma 为股票价格波动率。",
      explanation: [
        "15.10",
        "Let G(S,t)=h(t,T)S^n. Then G_t=h_t S^n, G_S=hnS^{n-1}, and G_{SS}=hn(n-1)S^{n-2}.",
        "Substituting into the Black-Scholes-Merton equation G_t + rS G_S + 0.5 sigma^2 S^2 G_{SS} = rG gives h_t + rnh + 0.5 sigma^2 n(n-1)h = rh. Hence h_t = -[r(n-1)+0.5 sigma^2 n(n-1)]h.",
        "At maturity the derivative is worth S^n, so the boundary condition is h(T,T)=1.",
        "Solving the ODE gives h(t,T)=exp{[0.5 sigma^2 n(n-1)+r(n-1)](T-t)}. When t=T the exponent is zero, so h(T,T)=1."
      ].join("\n\n"),
      explanationEn: [
        "15.10",
        "Let G(S,t)=h(t,T)S^n. Then G_t=h_t S^n, G_S=hnS^{n-1}, and G_{SS}=hn(n-1)S^{n-2}.",
        "Substituting into the Black-Scholes-Merton equation G_t + rS G_S + 0.5 sigma^2 S^2 G_{SS} = rG gives h_t + rnh + 0.5 sigma^2 n(n-1)h = rh. Hence h_t = -[r(n-1)+0.5 sigma^2 n(n-1)]h.",
        "At maturity the derivative is worth S^n, so the boundary condition is h(T,T)=1.",
        "Solving the ODE gives h(t,T)=exp{[0.5 sigma^2 n(n-1)+r(n-1)](T-t)}. When t=T the exponent is zero, so h(T,T)=1."
      ].join("\n\n"),
      explanationZh: [
        "15.10",
        "设衍生品价格为 G(S,t)=h(t,T)S^n。则 G_t=h_t S^n，G_S=hnS^{n-1}，G_{SS}=hn(n-1)S^{n-2}。",
        "代入 Black-Scholes-Merton 方程 G_t + rS G_S + 0.5 sigma^2 S^2 G_{SS} = rG，得到 h_t + rnh + 0.5 sigma^2 n(n-1)h = rh。因此 h_t = -[r(n-1)+0.5 sigma^2 n(n-1)]h。",
        "到期时衍生品价值为 S^n，所以边界条件为 h(T,T)=1。",
        "解该常微分方程得 h(t,T)=exp{[0.5 sigma^2 n(n-1)+r(n-1)](T-t)}。当 t=T 时指数为 0，因此 h(T,T)=1，满足边界条件。"
      ].join("\n\n")
    }
  },
  {
    id: "hull-derivatives-problem-347",
    reason: "Chinese prompt mixed untranslated English fragments and introduced a unit error.",
    fields: {
      promptZh: "问题 16.9. 某公司 CFO 说：“股票期权的会计处理太疯狂了。去年股价为 30 美元时，我们向员工授予了 10,000,000 份平价股票期权。我们在授予日估计每份期权价值为 5 美元。到年末股价跌至 4 美元，但我们仍然必须在损益表中确认 5,000 万美元费用。”请讨论。"
    }
  },
  {
    id: "hull-derivatives-problem-373",
    reason: "Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptZh: "问题 17.23. 假设加元的即期价格为 0.75 美元，且加元/美元汇率的年波动率为 8%。加拿大和美国的无风险利率分别为年化 4% 和 5%。计算一份 9 个月期欧式看涨期权的价值，该期权允许以 0.75 美元买入 1 加元。使用看涨看跌平价计算一份 9 个月期欧式看跌期权的价格，该期权允许以 0.75 美元卖出 1 加元。再问：用 1 加元在 9 个月后买入 0.75 美元的看涨期权价格是多少？"
    }
  },
  {
    id: "hull-derivatives-problem-399",
    reason: "Prompt included spillover from the next chapter introduction.",
    fields: {
      promptEn: "Practice 18.23. Calculate the price of a six-month European put option on the spot value of an index. The six-month forward price of the index is 1,400, the strike price is 1,450, the risk-free rate is 5%, and the volatility of the index is 15%.",
      promptZh: "问题 18.23. 计算一份基于指数现货价值的 6 个月期欧式看跌期权价格。该指数的 6 个月远期价格为 1,400，执行价格为 1,450，无风险利率为 5%，指数波动率为 15%。"
    }
  },
  {
    id: "hull-derivatives-problem-436",
    reason: "Prompt was truncated and Chinese prompt mixed untranslated English fragments.",
    fields: {
      promptEn: "Practice 20.13. Suppose that the result of a major lawsuit affecting a company is due to be announced tomorrow. The company’s stock price is currently USD 60. If the ruling is favorable to the company, the stock price is expected to jump to USD 75. If it is unfavorable, the stock is expected to jump to USD 50. What is the risk-neutral probability of a favorable ruling? Assume that the volatility of the company’s stock will be 25% for 6 months after the ruling if the ruling is favorable and 40% if it is unfavorable. Use DerivaGem to calculate the relationship between implied volatility and strike price for 6-month European call options today. The company pays no dividends. Assume that the 6-month risk-free interest rate is 6%. Consider strike prices of USD 30, USD 40, USD 50, USD 60, USD 70, and USD 80.",
      promptZh: "问题 20.13. 假设影响某公司的重大诉讼结果将在明天公布。该公司当前股价为 60 美元。如果裁决对公司有利，预计股价将跳升至 75 美元；如果裁决不利，预计股价将变为 50 美元。有利裁决的风险中性概率是多少？假设若裁决有利，裁决后 6 个月内公司股票波动率为 25%；若裁决不利，波动率为 40%。公司不支付股息，6 个月无风险利率为 6%。使用 DerivaGem 计算今天 6 个月期欧式看涨期权的隐含波动率与执行价格之间的关系，执行价格分别为 30、40、50、60、70 和 80 美元。",
      explanation: "20.13\nLet p be the risk-neutral probability of a favorable ruling. Ignoring one day's expected return, the current stock price must equal the expected stock price tomorrow: 75p + 50(1-p) = 60. Hence p=0.4.\n\nFor K=50, if the ruling is favorable, use S_0=75, r=0.06, T=0.5, and sigma=25%; DerivaGem gives a call price of 26.502. If the ruling is unfavorable, use S_0=50, r=0.06, T=0.5, and sigma=40%; DerivaGem gives a call price of 6.310. The current call value is the weighted average 0.4*26.502 + 0.6*6.310 = 14.387. With S_0=60, K=50, T=0.5, r=0.06, and c=14.387, the implied volatility is 47.76%.\n\nRepeating this calculation across strike prices gives the smile shown in the official solution: implied volatilities are approximately 46.67%, 47.78%, 47.76%, 46.05%, 43.22%, and 40.36% for strikes 30, 40, 50, 60, 70, and 80 respectively.",
      explanationEn: "20.13\nLet p be the risk-neutral probability of a favorable ruling. Ignoring one day's expected return, the current stock price must equal the expected stock price tomorrow: 75p + 50(1-p) = 60. Hence p=0.4.\n\nFor K=50, if the ruling is favorable, use S_0=75, r=0.06, T=0.5, and sigma=25%; DerivaGem gives a call price of 26.502. If the ruling is unfavorable, use S_0=50, r=0.06, T=0.5, and sigma=40%; DerivaGem gives a call price of 6.310. The current call value is the weighted average 0.4*26.502 + 0.6*6.310 = 14.387. With S_0=60, K=50, T=0.5, r=0.06, and c=14.387, the implied volatility is 47.76%.\n\nRepeating this calculation across strike prices gives the smile shown in the official solution: implied volatilities are approximately 46.67%, 47.78%, 47.76%, 46.05%, 43.22%, and 40.36% for strikes 30, 40, 50, 60, 70, and 80 respectively."
    }
  },
  {
    id: "hull-derivatives-problem-467",
    reason: "Boundary notation and explanation were garbled.",
    fields: {
      promptEn: "Practice 21.21. When do the boundary conditions for S = 0 and S -> infinity affect the estimates of derivative prices in the explicit finite difference method?",
      promptZh: "问题 21.21. 在显式有限差分法中，S = 0 和 S -> infinity 的边界条件什么时候会影响衍生品价格估计？",
      explanation: [
        "21.21",
        "Let S_t be the current asset price, S_max the highest asset price included in the grid, and S_min the lowest asset price included in the grid. Let Delta S be the stock-price step size and define Q_1=(S_t-S_min)/Delta S and Q_2=(S_max-S_t)/Delta S.",
        "In the explicit finite difference method, information propagates one grid node per time step through the triangular calculation structure. The lower boundary at S_min can affect the current node only if the number of time intervals N is at least Q_1. The upper boundary at S_max can affect it only if N is at least Q_2.",
        "Therefore the assumed boundary values affect the derivative price estimate when N >= min(Q_1,Q_2) for at least one boundary, and both boundaries can affect it when N >= max(Q_1,Q_2). If the grid boundaries are sufficiently far away relative to N, their assumed values do not influence the estimate at the current asset price."
      ].join("\n\n"),
      explanationEn: [
        "21.21",
        "Let S_t be the current asset price, S_max the highest asset price included in the grid, and S_min the lowest asset price included in the grid. Let Delta S be the stock-price step size and define Q_1=(S_t-S_min)/Delta S and Q_2=(S_max-S_t)/Delta S.",
        "In the explicit finite difference method, information propagates one grid node per time step through the triangular calculation structure. The lower boundary at S_min can affect the current node only if the number of time intervals N is at least Q_1. The upper boundary at S_max can affect it only if N is at least Q_2.",
        "Therefore the assumed boundary values affect the derivative price estimate when N >= min(Q_1,Q_2) for at least one boundary, and both boundaries can affect it when N >= max(Q_1,Q_2). If the grid boundaries are sufficiently far away relative to N, their assumed values do not influence the estimate at the current asset price."
      ].join("\n\n"),
      explanationZh: [
        "21.21",
        "设 S_t 为当前资产价格，S_max 为网格中考虑的最高资产价格，S_min 为网格中考虑的最低资产价格。令 Delta S 为价格步长，并定义 Q_1=(S_t-S_min)/Delta S，Q_2=(S_max-S_t)/Delta S。",
        "在显式有限差分法中，由于计算结构呈三角形，边界信息每经过一个时间步最多向内传播一个网格节点。下边界 S_min 只有在时间步数 N 至少达到 Q_1 时才会影响当前节点；上边界 S_max 只有在 N 至少达到 Q_2 时才会影响当前节点。",
        "因此，只要 N >= min(Q_1,Q_2)，至少有一个边界的假设值可能影响当前价格处的估计；若 N >= max(Q_1,Q_2)，两个边界都可能影响估计。若上下边界相对于时间步数足够远，它们的假设值不会传递到当前资产价格处。"
      ].join("\n\n")
    }
  },
  {
    id: "hull-derivatives-problem-470",
    reason: "Correlation-factor formulas were inconsistent and the English explanation was truncated.",
    fields: {
      explanation: [
        "21.24",
        "Let x_1, x_2, and x_3 be independent standard normal random variables. To create three standard normal variables epsilon_1, epsilon_2, epsilon_3 with correlations rho_12, rho_13, and rho_23, use a Cholesky-style construction.",
        "Set epsilon_1 = x_1.",
        "Set epsilon_2 = rho_12 x_1 + sqrt(1-rho_12^2) x_2.",
        "Set epsilon_3 = rho_13 x_1 + alpha_2 x_2 + alpha_3 x_3, where alpha_2 = (rho_23 - rho_12 rho_13) / sqrt(1-rho_12^2) and alpha_3 = sqrt(1 - rho_13^2 - alpha_2^2).",
        "These formulas give Corr(epsilon_1,epsilon_2)=rho_12, Corr(epsilon_1,epsilon_3)=rho_13, and Corr(epsilon_2,epsilon_3)=rho_23, provided the correlation matrix is positive semidefinite."
      ].join("\n\n"),
      explanationEn: [
        "21.24",
        "Let x_1, x_2, and x_3 be independent standard normal random variables. To create three standard normal variables epsilon_1, epsilon_2, epsilon_3 with correlations rho_12, rho_13, and rho_23, use a Cholesky-style construction.",
        "Set epsilon_1 = x_1.",
        "Set epsilon_2 = rho_12 x_1 + sqrt(1-rho_12^2) x_2.",
        "Set epsilon_3 = rho_13 x_1 + alpha_2 x_2 + alpha_3 x_3, where alpha_2 = (rho_23 - rho_12 rho_13) / sqrt(1-rho_12^2) and alpha_3 = sqrt(1 - rho_13^2 - alpha_2^2).",
        "These formulas give Corr(epsilon_1,epsilon_2)=rho_12, Corr(epsilon_1,epsilon_3)=rho_13, and Corr(epsilon_2,epsilon_3)=rho_23, provided the correlation matrix is positive semidefinite."
      ].join("\n\n"),
      explanationZh: [
        "21.24",
        "设 x_1、x_2、x_3 为相互独立的标准正态随机变量。若要生成三个标准正态变量 epsilon_1、epsilon_2、epsilon_3，使它们的相关系数分别为 rho_12、rho_13、rho_23，可以使用 Cholesky 分解式构造。",
        "令 epsilon_1 = x_1。",
        "令 epsilon_2 = rho_12 x_1 + sqrt(1-rho_12^2) x_2。",
        "令 epsilon_3 = rho_13 x_1 + alpha_2 x_2 + alpha_3 x_3，其中 alpha_2 = (rho_23 - rho_12 rho_13) / sqrt(1-rho_12^2)，alpha_3 = sqrt(1 - rho_13^2 - alpha_2^2)。",
        "这样可得到 Corr(epsilon_1,epsilon_2)=rho_12，Corr(epsilon_1,epsilon_3)=rho_13，Corr(epsilon_2,epsilon_3)=rho_23，前提是给定相关矩阵为半正定。"
      ].join("\n\n")
    }
  },
  {
    id: "hull-derivatives-problem-609",
    reason: "Prompt contained chapter spillover and the formula explanation was truncated.",
    fields: {
      promptEn: "Practice 26.35. Produce a formula for valuing a cliquet option where an amount Q is invested to produce a payoff at the end of n periods. The return earned each period is the greater of the return on an index, excluding dividends, and zero.",
      promptZh: "问题 26.35. 推导一个 cliquet 期权估值公式：投资金额 Q，在 n 个期间结束后产生收益。每个期间获得的收益率等于指数收益率（不含股息）与 0 中的较大者。",
      explanation: [
        "26.35",
        "Let each period have length tau. Let r be the risk-free rate, q the dividend yield on the index, sigma the volatility, and R_i the index return excluding dividends in period i. The payoff multiplier in period i is max(1+R_i,1), so the value is Q exp(-r n tau) E_hat[ product_{i=1}^n max(1+R_i,1) ].",
        "Assuming the successive index returns are independent under the risk-neutral measure, this becomes Q exp(-r n tau) [ E_hat max(S_i/S_{i-1},1) ]^n.",
        "Now max(S_i/S_{i-1},1) = 1 + max(S_i/S_{i-1}-1,0). The expectation of max(S_i-S_{i-1},0) over one period is obtained from the Black-Scholes-Merton call formula with strike S_{i-1}. Therefore E_hat max(S_i/S_{i-1},1) = 1 + exp((r-q)tau) N(d_1) - N(d_2), where d_1 = [(r-q+0.5 sigma^2)tau] / [sigma sqrt(tau)] and d_2=d_1-sigma sqrt(tau).",
        "Thus the cliquet value is Q exp(-r n tau) [1 + exp((r-q)tau) N(d_1) - N(d_2)]^n."
      ].join("\n\n"),
      explanationEn: [
        "26.35",
        "Let each period have length tau. Let r be the risk-free rate, q the dividend yield on the index, sigma the volatility, and R_i the index return excluding dividends in period i. The payoff multiplier in period i is max(1+R_i,1), so the value is Q exp(-r n tau) E_hat[ product_{i=1}^n max(1+R_i,1) ].",
        "Assuming the successive index returns are independent under the risk-neutral measure, this becomes Q exp(-r n tau) [ E_hat max(S_i/S_{i-1},1) ]^n.",
        "Now max(S_i/S_{i-1},1) = 1 + max(S_i/S_{i-1}-1,0). The expectation of max(S_i-S_{i-1},0) over one period is obtained from the Black-Scholes-Merton call formula with strike S_{i-1}. Therefore E_hat max(S_i/S_{i-1},1) = 1 + exp((r-q)tau) N(d_1) - N(d_2), where d_1 = [(r-q+0.5 sigma^2)tau] / [sigma sqrt(tau)] and d_2=d_1-sigma sqrt(tau).",
        "Thus the cliquet value is Q exp(-r n tau) [1 + exp((r-q)tau) N(d_1) - N(d_2)]^n."
      ].join("\n\n"),
      explanationZh: [
        "26.35",
        "设每个期间长度为 tau，无风险利率为 r，指数股息收益率为 q，指数波动率为 sigma，R_i 为第 i 个期间不含股息的指数收益率。第 i 期的收益乘数为 max(1+R_i,1)，因此期权价值为 Q exp(-r n tau) E_hat[ product_{i=1}^n max(1+R_i,1) ]。",
        "若在风险中性测度下各期间指数收益相互独立，则价值可写为 Q exp(-r n tau) [ E_hat max(S_i/S_{i-1},1) ]^n。",
        "注意 max(S_i/S_{i-1},1) = 1 + max(S_i/S_{i-1}-1,0)。单期中 max(S_i-S_{i-1},0) 的期望可由 Black-Scholes-Merton 看涨期权公式得到，其中执行价格为 S_{i-1}。因此 E_hat max(S_i/S_{i-1},1) = 1 + exp((r-q)tau) N(d_1) - N(d_2)，其中 d_1 = [(r-q+0.5 sigma^2)tau] / [sigma sqrt(tau)]，d_2=d_1-sigma sqrt(tau)。",
        "所以 cliquet 期权价值为 Q exp(-r n tau) [1 + exp((r-q)tau) N(d_1) - N(d_2)]^n。"
      ].join("\n\n")
    }
  }
];

const changes = [];
const missing = [];
for (const repair of repairs) {
  const problem = problemById.get(repair.id);
  if (!problem) {
    missing.push(repair.id);
    continue;
  }
  const changedFields = [];
  for (const [field, value] of Object.entries(repair.fields)) {
    if (problem[field] !== value) {
      problem[field] = value;
      changedFields.push(field);
    }
  }
  problem.manualContentReviewed = true;
  problem.manualContentReviewSource = reviewSource;
  problem.manualContentReviewReason = repair.reason;
  problem.updatedAt = new Date().toISOString();
  changes.push({
    id: repair.id,
    titleEn: problem.titleEn,
    changedFields,
    reason: repair.reason
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: !options.apply,
  source: relativePath(sourcePath),
  changedProblemCount: changes.length,
  missing,
  changes
};

if (options.apply) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(payload, null, 2)}\n`);
  if (options.rebuild) runNodeScript("scripts/build-problem-catalog.mjs");
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  changedProblemCount: report.changedProblemCount,
  missing: report.missing.length,
  report: relativePath(reportPath)
}, null, 2));

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, scriptPath)], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "apply" || key === "rebuild") {
      parsed[key] = true;
      continue;
    }
    parsed[key] = args[index + 1];
    index += 1;
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath) || ".";
}
