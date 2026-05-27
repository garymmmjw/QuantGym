# QuantGuide Question

## 598. Maximum Volatility

**Metadata**

- ID: `5HccMURpIEx0ilHiT3lq`
- URL: https://www.quantguide.io/questions/maximum-volatility
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: QSE
- Tags: Finance, Differential Equations
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-8 16:21:19 America/New_York
- Last Edited By: Gabe

### 题干

Given an European call option, what would the price of our contract go to as the volatility tends towards infinity?

$$$$

Enter $-1$ for negative infinity, $0$ for zero, and $1$ for infinity.

### Hint

$$\frac{\partial C}{\partial t} + rS\frac{\partial C}{\partial S} + \frac{1}{2}\sigma^2 S^2 \frac{\partial^2 C}{\partial S^2} - rC = 0$
$$$$

The partial derivatives \(\frac{\partial C}{\partial t}\), \(\frac{\partial C}{\partial S}\), \(\frac{\partial^2 C}{\partial S^2}\), \(\frac{\partial P}{\partial t}\), \(\frac{\partial P}{\partial S}\), and \(\frac{\partial^2 P}{\partial S^2}\) denote the respective partial derivatives with respect to time and the stock price.


### 解答

We can approach this problem in one of two ways, either intuitively or through the Black-Scholes equation. 
$$$$
First we'll look through the lens of the Black-Scholes equation. The Black-Scholes equation for the price of a European call option:
$\frac{\partial C}{\partial t} + rS\frac{\partial C}{\partial S} + \frac{1}{2}\sigma^2 S^2 \frac{\partial^2 C}{\partial S^2} - rC = 0$

$$$$
In these equations: $$$$
- \(C\) represents the price of the European call option. $$$$
- \(S\) is the current stock price. $$$$
- \(t\) is the time to expiration. $$$$
- \(r\) is the risk-free interest rate. $$$$
- \(\sigma\) is the volatility of the underlying stock.$$$$
$$$$
Using this information, and plugging in an infinity for $\sigma$, we can simplify our equation to $\infty - rC = 0$, meaning the price of our option must tend to infinity as well. 
$$$$
Thinking about this more intuitively, under normal conditions, the greater the volatility ($\nu$), the more the seller demands in order to protect against big moves against his position. When this volatility is tending to infinity, this means the seller needs near infinite protection in order to justify selling the call.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5HccMURpIEx0ilHiT3lq",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 16:21:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4769623,
    "source": "QSE",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      },
      {
        "tag": "Differential Equations"
      }
    ],
    "title": "Maximum Volatility",
    "topic": "finance",
    "urlEnding": "maximum-volatility",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "5HccMURpIEx0ilHiT3lq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      },
      {
        "tag": "Differential Equations"
      }
    ],
    "title": "Maximum Volatility",
    "topic": "finance",
    "urlEnding": "maximum-volatility"
  }
}
```
