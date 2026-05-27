# QuantGuide Question

## 322. Straddle Output

**Metadata**

- ID: `WILJKJRWtawRHkLhH0va`
- URL: https://www.quantguide.io/questions/straddle-output
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW, Citadel, Goldman Sachs
- Source: drw
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:15:43 America/New_York
- Last Edited By: Gabe

### 题干

We have a straddle with strike $K = 0$. The underlying asset price is $S \sim N(0,1)$. What is the value of $v$, the expected value of the straddle? $v^2$ can be written in the form $\dfrac{a}{\pi}$ for a rational number $a$. Find $a$.

### Hint

The expected value of the straddle is $\mathbb{E}[|S-K|] = \mathbb{E}[|S|]$, as $K = 0$. This reduces to a pure probability problem.

### 解答

The expected value of the straddle is $\mathbb{E}[|S-K|] = \mathbb{E}[|S|]$, as $K = 0$. We are going to generalize this calculation for when $S \sim N(0,\sigma^2)$. 

$$\begin{aligned} E[|S|] & =\int_{-\infty}^{\infty} \frac{1}{\sqrt{2 \pi \sigma^2}}|x| \exp \left(-\frac{x^2}{2 \sigma^2}\right) d x \\ & =\frac{2}{\sqrt{2 \pi \sigma^2}} \int_0^{\infty} x \exp \left(-\frac{x^2}{2 \sigma^2}\right) d x \\ & =\left.\sqrt{\frac{2}{\pi \sigma^2}}\left(-\sigma^2 \exp \left(-\frac{x^2}{2 \sigma^2}\right)\right)\right|_0 ^{\infty} \\ & =\sqrt{\frac{2}{\pi}} \sigma,\end{aligned}$$

From line $1$ to line $2$, we use symmetry of the integrand about $0$. Then, from line $2$ to line $3$, we apply a $u-$substitution to obtain that indefinite integral. In particular, $\sigma = 1$ here, so our answer is $v = \sqrt{\dfrac{2}{\pi}}$, meaning that $v^2 = \dfrac{2}{\pi}$, so $a = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "WILJKJRWtawRHkLhH0va",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:15:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2501124,
    "source": "drw",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Straddle Output",
    "topic": "finance",
    "urlEnding": "straddle-output",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "WILJKJRWtawRHkLhH0va",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Straddle Output",
    "topic": "finance",
    "urlEnding": "straddle-output"
  }
}
```
