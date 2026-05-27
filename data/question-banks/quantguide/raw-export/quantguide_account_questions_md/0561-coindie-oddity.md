# QuantGuide Question

## 561. Coin-Die Oddity

**Metadata**

- ID: `4HqIpqZPSKgkguuAoa1V`
- URL: https://www.quantguide.io/questions/coindie-oddity
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://math.stackexchange.com/questions/1623860/what-is-the-probability-that-the-sum-of-the-die-rolls-is-odd?rq=1
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:12:31 America/New_York
- Last Edited By: Gabe

### 题干

Abdelrahman flips $2$ fair coins. For each head that results, Abdelrahman rolls one fair $6-$sided die. Find the probability that the sum of all the upfaces is odd.

### Hint

The number of dice rolled is dependent upon the number of heads that we see. Condition on the number of heads flipped.

### 解答

The number of dice rolled is dependent upon the number of heads that we see. Therefore, we should condition on the number of heads obtained. We see $0,1,$ and $2$ heads with respective probabilities $\dfrac{1}{4}, \dfrac{1}{2},$ and $\dfrac{1}{4}$. 

$$$$

If we obtain no heads, then the sum is $0$, which is even. Therefore, our probability in this case is $0$. If we obtain $1$ head, then $3$ of the $6$ equally-likely values are odd, so the probability is $\dfrac{1}{2}$ in this case. If we obtain $2$ heads, then we roll $2$ dice. The possible values are $3,5,7,9,$ and $11$. The number of combinations resulting in those sums is $2+4+6+4+2 = 18$. There are $6^2 = 36$ total outcomes, so the probability of an odd value in this case is $\dfrac{1}{2}$ as well. Therefore, by the Law of Total Probability, the probability of an odd value is $$\dfrac{1}{4} \cdot 0 + \dfrac{1}{2} \cdot \dfrac{1}{2} + \dfrac{1}{4} \cdot \dfrac{1}{2} = \dfrac{3}{8}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/8"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4HqIpqZPSKgkguuAoa1V",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:12:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4496087,
    "source": "https://math.stackexchange.com/questions/1623860/what-is-the-probability-that-the-sum-of-the-die-rolls-is-odd?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Coin-Die Oddity",
    "topic": "probability",
    "urlEnding": "coindie-oddity",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "4HqIpqZPSKgkguuAoa1V",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Coin-Die Oddity",
    "topic": "probability",
    "urlEnding": "coindie-oddity"
  }
}
```
