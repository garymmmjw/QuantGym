# QuantGuide Question

## 816. Absolute Normal Difference

**Metadata**

- ID: `7dmtWJEqnrE9aFvCAVR4`
- URL: https://www.quantguide.io/questions/absolute-normal-difference
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, DRW, Goldman Sachs
- Source: cit
- Tags: Expected Value, Continuous Random Variables, Calculus
- Premium: False
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-7 12:16:30 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X \sim N(0,1)$ and $Y \sim N(0,4)$ are independent. Compute $\mathbb{E}[|Y - X|]$. The answer will be in the form $\left(\dfrac{K}{\pi}\right)^b$ for rational $b$ and $K$. Find $bK$.

### Hint

Since $X$ and $Y$ are independent, we have that $Y - X \sim N(0,5)$. Therefore, if $W = Y - X \sim N(0,5)$, we want to compute $\mathbb{E}[|W|]$. Note that $W = \sqrt{5}Z$, where $Z \sim N(0,1)$, so we can really just compute $\sqrt{5} \mathbb{E}[|Z|]$.

### 解答

Since $X$ and $Y$ are independent, we have that $Y - X \sim N(0,5)$. Therefore, if $W = Y - X \sim N(0,5)$, we want to compute $\mathbb{E}[|W|]$. Note that $W = \sqrt{5}Z$, where $Z \sim N(0,1)$, so we can really just compute $\sqrt{5} \mathbb{E}[|Z|]$. We can compute this via LOTUS for a general $Z \sim N(0,\sigma^2)$, as the calculation is the same: 

$$\begin{aligned} E[|Z|] & =\int_{-\infty}^{\infty} \frac{1}{\sqrt{2 \pi \sigma^2}}|x| \exp \left(-\frac{x^2}{2 \sigma^2}\right) d x \\ & =\frac{2}{\sqrt{2 \pi \sigma^2}} \int_0^{\infty} x \exp \left(-\frac{x^2}{2 \sigma^2}\right) d x \\ & =\left.\sqrt{\frac{2}{\pi \sigma^2}}\left(-\sigma^2 \exp \left(-\frac{x^2}{2 \sigma^2}\right)\right)\right|_0 ^{\infty} \\ & =\sqrt{\frac{2}{\pi}} \sigma,\end{aligned}$$

From line $1$ to line $2$, we use symmetry of the integrand about $0$. Then, from line $2$ to line $3$, we apply a $u-$substitution to obtain that indefinite integral. In particular, $\sigma = \sqrt{5}$ here, as $\sigma^2 = 5$, so our answer is $\sqrt{\dfrac{10}{\pi}}$, meaning that $bK = 0.5 \cdot 10 = 5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7dmtWJEqnrE9aFvCAVR4",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:16:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6688280,
    "randomizable": "",
    "source": "cit",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Absolute Normal Difference",
    "topic": "probability",
    "urlEnding": "absolute-normal-difference",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "7dmtWJEqnrE9aFvCAVR4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Absolute Normal Difference",
    "topic": "probability",
    "urlEnding": "absolute-normal-difference"
  }
}
```
