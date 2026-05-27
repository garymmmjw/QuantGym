# QuantGuide Question

## 257. Normal Activities

**Metadata**

- ID: `bgaaelCjuiYgSE35KZn8`
- URL: https://www.quantguide.io/questions/normal-activities
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Hudson River Trading, Five Rings, Squarepoint Capital, Akuna
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-12 16:31:48 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X$ and $Y$ are independent standard normal random variables. Find $\mathbb{P}[Y > 4X]$.

### Hint

What is the distribution of $Y - 4X$?

### 解答

As $X$ and $Y$ are mean $0$ normal random variables, $Y - 4X$ is also a mean $0$ normal random variable. Therefore, $\mathbb{P}[Y > 4X] = \mathbb{P}[Y - 4X > 0]$ is asking the probability that a normal random variable is greater than its mean. This is $\dfrac{1}{2}$ by the symmetry of the normal distribution about its mean.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "bgaaelCjuiYgSE35KZn8",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-12 16:31:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2017944,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Normal Activities",
    "topic": "statistics",
    "urlEnding": "normal-activities",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "bgaaelCjuiYgSE35KZn8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Normal Activities",
    "topic": "statistics",
    "urlEnding": "normal-activities"
  }
}
```
