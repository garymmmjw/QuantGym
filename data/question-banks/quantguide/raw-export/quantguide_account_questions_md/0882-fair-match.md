# QuantGuide Question

## 882. Fair Match

**Metadata**

- ID: `94iqFDVWweS4g0xeWdAB`
- URL: https://www.quantguide.io/questions/fair-match
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that Andy has $m$ $6-$sided dice and Bandy has $n$ $8-$sided dice. If $S_m$ is the sum of the upfaces of all $m$ of Andy's dice and $T_n$ is the sum of the upfaces of all $n$ of Bandy's dice, find the product $m^*n^*$, where $m^*$ and $n^*$ are the smallest integer values of $m$ and $n$ such that $\mathbb{P}[S_{m^*} < T_{n^*}] = \mathbb{P}[S_{m^*} > T_{n^*}]$.

### Hint

If $X_1,\dots, X_k$ are IID random variables that have PMFs symmetric about their mean, $X_1 + \dots +X_k$ is also symmetric about its mean.

### 解答

We know that the PMFs of the value of a roll of a fair $6-$sided and $8-$sided dice are symmetric about their respective means $3.5$ and $4.5$. Therefore, the PMFs of the sums of independent $6-$sided and $8-$sided dice are symmetric about their means. Namely, $S_m$ has a symmetric PMF about $3.5m$ and $T_n$ has a symmetric PMF about $4.5n$. Therefore, if we can find values of $m$ and $n$ such that the means are the same, both sums will be symmetric about the means, and the condition in the question will be satisfied. This means we must find the smallest $m$ and $n$ satisfying $3.5m = 4.5n$. These would be the same as the smallest $m$ and $n$ such that $7m = 9n$ by multiplication of $2$ on both sides. As $7$ and $9$ are relatively prime, the smallest integer solution is $m^* = 9$ and $n^* = 7$, so $m^*n^* = 63$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "63"
    ],
    "difficulty": "medium",
    "id": "94iqFDVWweS4g0xeWdAB",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7231245,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Fair Match",
    "topic": "brainteasers",
    "urlEnding": "fair-match"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "94iqFDVWweS4g0xeWdAB",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Fair Match",
    "topic": "brainteasers",
    "urlEnding": "fair-match"
  }
}
```
