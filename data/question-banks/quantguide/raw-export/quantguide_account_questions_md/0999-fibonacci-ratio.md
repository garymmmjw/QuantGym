# QuantGuide Question

## 999. Fibonacci Ratio

**Metadata**

- ID: `uYR1jFG5ggMLYyWq8hYZ`
- URL: https://www.quantguide.io/questions/fibonacci-ratio
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: mazur edited
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 13:39:01 America/New_York
- Last Edited By: Gabe

### 题干

Let $F_n$ be the $n$th Fibonacci number. Compute $\dfrac{F_1 + F_2 + F_3 + \dots + F_{300}}{F_3 + F_6 + F_9 + \dots + F_{300}}$.

### Hint

Rewrite the numerator using the terms that are indexed of the multiples of $3$.

### 解答

Consider $F_0 + F_1 + F_2 + \dots + F_{300}$. Note that by the definition of Fibonacci Numbers, $$F_1 + F_2 = F_3, F_4 + F_5 = F_6, \dots, F_{298} + F_{299} =  F_{300}$$ Therefore, we can rewrite the numerator as $(F_3 + F_3) + (F_6 + F_6) + \dots + (F_{300} + F_{300}) = 2(F_3 + F_6 + F_9 + \dots + F_{300})$. This means our answer is $2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "uYR1jFG5ggMLYyWq8hYZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:39:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8154262,
    "source": "mazur edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Fibonacci Ratio",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-ratio",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "uYR1jFG5ggMLYyWq8hYZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Fibonacci Ratio",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-ratio"
  }
}
```
