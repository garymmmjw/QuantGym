# QuantGuide Question

## 1078. Ramen Bowl

**Metadata**

- ID: `JPJuA143X1ms9ZW4EWoa`
- URL: https://www.quantguide.io/questions/ramen-bowl
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street, Goldman Sachs, Hudson River Trading, IMC
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:21:20 America/New_York
- Last Edited By: Gabe

### 题干

There are 100 noodles in your bowl of ramen. You take the ends of two noodles uniformly at random and connect the two, putting the connected noodle back into the bowl and continuing until there are no ends left to connect. On average, how many circles will you create? Round to the nearest whole number.

### Hint

How many circles do you create when there is only one noodle? Two noodles? $n$ noodles?

### 解答

Let $f(n)$ be the number of circles creates from $n$ starting noodles- we are looking for $E[f(100)]$. When $n=1$, it is clear that $E[f(n)] = 1$ since we connect the two ends of the only noodle. For $n=2$, there are a total of ${4 \choose 2}=6$ possible combinations to connect the first two ends. Of these 6 combinations, 4 will yield a single noodle ($f(1)$) and 2 will yield a noodle and a circle ($1+f(1))$). Hence,

$$E[f(2)] = \frac{4}{6} \times E[f(1)] + \frac{2}{6} \times (1 + E[f(1)]) = 1 + \frac{1}{3}$$

For $n=3$, there are a total of ${6 \choose 2} = 15$ possible combinations to connect the first two ends. Of these 15 combinations, 12 will yield will yield two noodles ($f(2)$) and 3 will yield two noodles and a circle ($1+f(2))$). Hence, 

$$E[f(3)] = \frac{12}{15} \times E[f(2)] + \frac{3}{15} \times (1 + E[f(2)]) = 1 + \frac{1}{3} + \frac{1}{5}$$

The pattern is now noticeable: $E[f(n)] = 1 + \frac{1}{3} + ... + \frac{1}{2n-1}$, and thus $E[f(100)] \approx 3.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "JPJuA143X1ms9ZW4EWoa",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:21:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8799832,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ramen Bowl",
    "topic": "probability",
    "urlEnding": "ramen-bowl",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "hard",
    "id": "JPJuA143X1ms9ZW4EWoa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ramen Bowl",
    "topic": "probability",
    "urlEnding": "ramen-bowl"
  }
}
```
