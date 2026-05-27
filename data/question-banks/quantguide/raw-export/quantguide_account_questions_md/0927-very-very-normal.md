# QuantGuide Question

## 927. Very Very Normal

**Metadata**

- ID: `9cHrBVNcVoeDN910xHfs`
- URL: https://www.quantguide.io/questions/very-very-normal
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: 5r
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-25 20:07:27 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y,Z \sim N(12,12)$ IID. Compute $\mathbb{P}[X-Y > Z]$. The answer is in the form $\Phi(a)$ for some $a$. Find $a$.

### Hint

Write this as $\mathbb{P}[X-Y-Z > 0]$. What is the distribution of $X - Y - Z$?

### 解答

We can write this as $\mathbb{P}[X-Y-Z > 0]$. $W = X - Y-Z \sim N(-12,36)$ by the properties of independent normal distributions. Therefore, we can write as $\mathbb{P}[W > 0]$, and we can standardize this to obtain $\mathbb{P}\left[\dfrac{W+12}{6} > \dfrac{12}{6}\right]$. The LHS is now standard normal, so the answer is $\Phi(-2)$ by symmetry of the normal distribution. This means $a = -2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-2"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "9cHrBVNcVoeDN910xHfs",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 20:07:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7574797,
    "source": "5r",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Very Very Normal",
    "topic": "probability",
    "urlEnding": "very-very-normal",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "9cHrBVNcVoeDN910xHfs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Very Very Normal",
    "topic": "probability",
    "urlEnding": "very-very-normal"
  }
}
```
