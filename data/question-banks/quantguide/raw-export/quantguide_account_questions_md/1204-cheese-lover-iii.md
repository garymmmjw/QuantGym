# QuantGuide Question

## 1204. Cheese Lover III

**Metadata**

- ID: `HMewh1iJipm1jvVGFkjD`
- URL: https://www.quantguide.io/questions/cheese-lover-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW, SIG, AQR
- Source: og
- Tags: Continuous Random Variables, Limit Theorems
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-21 13:35:09 America/New_York
- Last Edited By: Gabe

### 题干

Jon loves cheese. He decides to make $100$ blocks of cheese. The distribution of the weight (in grams) of each block he makes follows IID Exp$\left(\dfrac{1}{250}\right)$ distribution. Let $W_i$ denote the weight of the $i$th block of cheese, and $T_{100}$ represent the total weight of the $100$ blocks of cheese. Using Central Limit Theorem, what is an approximation for $\mathbb{P}[T_{100} > 26000]$? The answer is in the form $\Phi(a)$ for some real $a$. $\Phi$ here is the CDF of the standard normal distribution. Find $a$.

### Hint

First standardize $T_{100}$ by subtracting the mean and dividing by standard deviation.

### 解答

We subtract the expectation of $T_{100} = 25000$ from both sides, then divide by Var$(T_{100}) = 100(250)^2$ (by recognition of using linearity of variance), implying that $\sigma_{T_{100}} = \sqrt{100(250)^2} = 250\sqrt{100} = 2500$. Thus. we get that $$\mathbb{P}[T_{100} > 26000] = 1 - \mathbb{P}[T \leq 26000] = 1 - \mathbb{P}[T_{100} - 25000 \leq 26000 - 25000] = 1 - \mathbb{P}\left[\dfrac{T_{100} - 25000}{2500} \leq \dfrac{1000}{2500}\right]$$ We approximate the LHS using a standard normal random variable by the CLT, so we are using the approximation $1 - \mathbb{P}\left[Z \leq \frac{2}{5}\right]$, where $Z \sim N(0,1)$. This last quantity is $1 - \Phi(\frac{2}{5}) = \Phi(-\frac{2}{5})$. Therefore, $a = -2/5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-2/5"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "AQR"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "HMewh1iJipm1jvVGFkjD",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-21 13:35:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9988629,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Cheese Lover III",
    "topic": "probability",
    "urlEnding": "cheese-lover-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "AQR"
      }
    ],
    "difficulty": "easy",
    "id": "HMewh1iJipm1jvVGFkjD",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Cheese Lover III",
    "topic": "probability",
    "urlEnding": "cheese-lover-iii"
  }
}
```
