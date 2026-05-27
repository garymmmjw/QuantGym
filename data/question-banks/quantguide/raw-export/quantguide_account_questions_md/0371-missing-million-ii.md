# QuantGuide Question

## 371. Missing Million II

**Metadata**

- ID: `xyxVfYTWm6pHVTKTX3Xa`
- URL: https://www.quantguide.io/questions/missing-million-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Optiver
- Source: optiver
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 09:33:17 America/New_York
- Last Edited By: Gabe

### 题干

You are on a game show with $3$ doors in front of you. One of the doors has $\$1$ million inside, while the other two are empty. In the final round, the host lets you spin a wheel two times that may reveal which door the $\$1$ million is in.  On each spin, this wheel will tell you the location of the $\$1$ million $3/5$ of the time, independent between spins. Otherwise, it tells you nothing about the location of the money. After two spins, if the wheel has not revealed to you the location of the $\$1$ million, you must guess uniformly at random. What is the probability you locate the $\$1$ million door?

### Hint

We do not locate the door with $\$1$ million exactly when the wheel does not tell us any information both times.

### 解答

We do not locate the door with $\$1$ million exactly when the wheel does not tell us any information both times. This occurs with probability $2/5$ per trial, so the probability you don't get any information about the location of the money is $\dfrac{2}{5} \cdot \dfrac{2}{5} = \dfrac{4}{25}$. This means that with probability $\dfrac{21}{25}$, you are guaranteed to know where the money is located via the wheel. Otherwise, with probability $\dfrac{4}{25}$, you guess uniformly at random among the doors and locate the money with probability $\dfrac{1}{3}$. This implies the total probability of finding the money is $$\dfrac{21}{25} + \dfrac{1}{3} \cdot \dfrac{4}{25} = \dfrac{67}{75}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "67/75"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xyxVfYTWm6pHVTKTX3Xa",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:33:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2871663,
    "source": "optiver",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing Million II",
    "topic": "probability",
    "urlEnding": "missing-million-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "xyxVfYTWm6pHVTKTX3Xa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing Million II",
    "topic": "probability",
    "urlEnding": "missing-million-ii"
  }
}
```
