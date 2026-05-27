# QuantGuide Question

## 583. Egg Drop I

**Metadata**

- ID: `wyXIh3oi7vFUlgbh5QlX`
- URL: https://www.quantguide.io/questions/egg-drop
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Aquatic Capital, TransMarket Group, Optiver, Tower Research Capital, Virtu Financial, WorldQuant, Akuna
- Source: N/A
- Tags: Games
- Premium: True
- Solution Free: False
- Version: 10
- Last Edited: 2023-11-5 10:31:58 America/New_York
- Last Edited By: Gabe

### 题干

You are holding two identical eggs in a 100-story building. If an egg is dropped at an elevation under story $X$, then the egg will survive; else, the egg breaks. What is the minimum number of drops required to determine $X$ in the worst-case scenario?

### Hint

Assume we design a strategy with $N$ maximum drops. If the first egg is dropped once, then the second egg can cover $N-1$ floors. If the first egg is dropped twice, then the second egg can cover $N-2$ floors.

### 解答

Suppose that we have a strategy with a maximum number of $N$ drops. For the first drop of the first egg, we can try the $N$-th floor. If the egg breaks, we can start to try the second egg from the first floor and increase the floor number by one until the second egg breaks. At most, there are $N-1$ floors to tests. If the first egg dropped from the $N$-th floor does not break, then we have $N-1$ drops left. This time we can only increase the floor number by $N-1$ for the first egg since the second egg can only cover $N-2$ floors if the first egg breaks. If the egg dropped from the $2N-1$-th floor does not break, then we have $N-2$ drops left. Therefore, we can only increase the floor number by $N-2$ for the first egg since the second egg can only cover $N-3$ floors if the first egg breaks. Using such logic, we can see that the number of floors that these two eggs can cover with a maximum of N drops is  $$N+(N-1)  + ... 1 \geq 100 \newline \newline \frac{N(N+1)}{2} \geq 100 \newline \newline N = 14$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14"
    ],
    "companies": [
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Tower Research Capital"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wyXIh3oi7vFUlgbh5QlX",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:31:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4684434,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Egg Drop I",
    "topic": "brainteasers",
    "urlEnding": "egg-drop",
    "version": 10
  },
  "list_summary": {
    "companies": [
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Tower Research Capital"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "wyXIh3oi7vFUlgbh5QlX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Egg Drop I",
    "topic": "brainteasers",
    "urlEnding": "egg-drop"
  }
}
```
