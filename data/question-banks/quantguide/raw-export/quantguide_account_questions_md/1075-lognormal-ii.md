# QuantGuide Question

## 1075. Lognormal II

**Metadata**

- ID: `pPgnaTSWpHs4wutmw6DO`
- URL: https://www.quantguide.io/questions/lognormal-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Vatic Labs
- Source: jhu prob edited
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 10:04:55 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $\ln(X) \sim N(0,1)$. Find $\text{Var}(X^4)$. Your answer will be in the form of $e^a - e^b$ for positive integers $a$ and $b$. Find $a + b$.

### Hint

Let $Z \sim N(0,1)$. Then we know that $X = e^Z$, so $\text{Var}(X^4) = \mathbb{E}[X^8] - (\mathbb{E}[X^4])^2$ by the definition of variance. Plug in the expression for $X$ above and note that it looks like the MGF of $Z$ with some certain values plugged in.

### 解答

Let $Z \sim N(0,1)$. Then we know that $X = e^Z$, so $\text{Var}(X^4) = \mathbb{E}[X^8] - (\mathbb{E}[X^4])^2$ by the definition of variance. Plugging in $X = e^Z$, we get that $\text{Var}(X^4) = \mathbb{E}[e^{8Z}] - (\mathbb{E}[e^{4Z}])^2$. By definition, we know that for a random variable $X$, the MGF of $X$ is given by $M_X(\theta) = \mathbb{E}[e^{\theta X}]$ for all $\theta$ where the expectation is finite. Therefore, we see that $\text{Var}(X^3) = M_Z(8) - (M_Z(4))^2$, where $M_Z(\theta)$ is the MGF of a standard normal random variable.

$$$$

We know that the MGF of a standard normal is given by $M_Z(\theta) = e^{\frac{1}{2}\theta^2}$. Therefore, plugging in $\theta = 8$ and $\theta = 4$, we get that $\text{Var}(X^4) = e^{32} - e^{16}$, so our answer is $32 + 16 = 48$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "48"
    ],
    "companies": [
      {
        "company": "Vatic Labs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "pPgnaTSWpHs4wutmw6DO",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 10:04:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8767507,
    "source": "jhu prob edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Lognormal II",
    "topic": "probability",
    "urlEnding": "lognormal-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Vatic Labs"
      }
    ],
    "difficulty": "medium",
    "id": "pPgnaTSWpHs4wutmw6DO",
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
    "title": "Lognormal II",
    "topic": "probability",
    "urlEnding": "lognormal-ii"
  }
}
```
