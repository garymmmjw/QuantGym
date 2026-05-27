# QuantGuide Question

## 565. The Big Three

**Metadata**

- ID: `076pFrBcyfhcjR0ntQyz`
- URL: https://www.quantguide.io/questions/the-big-three
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Jane Street
- Source: N/A
- Tags: Events, Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:36:23 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we roll 5 standard fair dice and sum the upfaces of the largest 3 values showing. Find the probability that the sum is $18$.

### Hint

What needs to happen to get a sum of $18$ from three standard dice?

### 解答

To obtain a sum of $18$ from three dice, we need to have at least 3 sixes among the 5 dice. Therefore, we really are just asking for the probability of $3,4,$ or $5$ sixes among $5$ die rolls. The probability of $5$ sixes is just $\dfrac{1}{6^5}$, as it is just $\dfrac{1}{6}$ probability for each die. The probability of $4$ sixes is $5 \cdot \dfrac{5}{6} \cdot \dfrac{1}{6^4}$, as we have $5$ ways to select the die that isn't a $6$, a $\dfrac{5}{6}$ probability that the select die is not a $6$, and then $\dfrac{1}{6}$ probability for each of the other 4 dice to be a $6$. Lastly, the probability that we have exactly $3$ sixes is $\displaystyle \binom{5}{2} \cdot \left(\dfrac{5}{6}\right)^2 \cdot \dfrac{1}{6^3}$. This is because there are $\displaystyle \binom{5}{2} = 10$ ways to pick the two dice that aren't a $6$, $\dfrac{5}{6}$ probability for each of them to not be a $6$, and $\dfrac{1}{6}$ probability for each of the remaining three dice to be a $6$. Adding all of these up yields $$\dfrac{1}{6^5} + \dfrac{25}{6^5} + \dfrac{250}{6^5} = \dfrac{276}{6^5} = \dfrac{23}{648}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "23/648"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "076pFrBcyfhcjR0ntQyz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:36:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4550977,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "The Big Three",
    "topic": "probability",
    "urlEnding": "the-big-three",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "076pFrBcyfhcjR0ntQyz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "The Big Three",
    "topic": "probability",
    "urlEnding": "the-big-three"
  }
}
```
