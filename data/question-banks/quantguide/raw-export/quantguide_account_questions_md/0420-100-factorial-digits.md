# QuantGuide Question

## 420. 100 Factorial Digits

**Metadata**

- ID: `K1sPT8Sx1bxBqbHu5qJW`
- URL: https://www.quantguide.io/questions/100-factorial-digits
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: DRW, SIG, WorldQuant, Virtu Financial, Five Rings, Jump Trading
- Source: common q
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-6 10:28:47 America/New_York
- Last Edited By: Gabe

### 题干

How many digits are in $100!$?

### Hint

What function can we use to get the number of digits in a number? Think about $100$, where there are $3$ digits. 

### 解答

First, we can see that $\log_{10}(100) = 2$, so to get the number of digits, we just have to add $1$. Thus, we want to find $\log_{10}(100!) = \log(1) + \log(2) + \dots + \log(100)$ and then add $1$. We can approximate this as the integral of $\log_{10}(x)$ on $[1, 100]$. 

$$\\$$

Integrating $\int_{1}^{100} \log(x) \ dx \approx 157$. Adding $1$, we get $158$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "158"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Jump Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "K1sPT8Sx1bxBqbHu5qJW",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 10:28:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3362206,
    "randomizable": "",
    "source": "common q",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "100 Factorial Digits",
    "topic": "brainteasers",
    "urlEnding": "100-factorial-digits",
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
        "company": "WorldQuant"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Jump Trading"
      }
    ],
    "difficulty": "medium",
    "id": "K1sPT8Sx1bxBqbHu5qJW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "100 Factorial Digits",
    "topic": "brainteasers",
    "urlEnding": "100-factorial-digits"
  }
}
```
