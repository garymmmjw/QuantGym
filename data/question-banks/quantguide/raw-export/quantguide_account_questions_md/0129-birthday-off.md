# QuantGuide Question

## 129. Birthday Off

**Metadata**

- ID: `S5HGcLhulyWyz0yhKuWu`
- URL: https://www.quantguide.io/questions/birthday-off
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Millennium Management, Squarepoint Capital
- Source: Millenium OA
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-27 17:14:37 America/New_York
- Last Edited By: Gabe

### 题干

Let $b(n)$ be the expected number of distinct birthdays (number of days of the year where exactly one person has a birthday) among $n$ people. There are two integer values of $n$ that maximize $b(n)$. Find the sum of the two values.

### Hint

Let $X_i$ be the indicator that person $i$ has a distinct birthday from the rest.

### 解答

Let $X_1,X_2,\dots, X_N$ be the indicators of the event that the $i$th person, $1 \leq i \leq N$, has a distinct birthday distinct from the other $N-1$ people. Then $T = X_1 + \dots + X_N$ gives the total number of distinct birthdays in the year. Then $b(N) = \mathbb{E}[T] = N \mathbb{E}[X_1]$ by linearity of expectation and the fact that each person is equally likely to have a distinct birthday from everyone else. 

$$$$

$\mathbb{E}[X_1]$ is the probability that person $1$ has a distinct birthday from everyone else. Fix the birthday of person $1$. Then the other $N-1$ people must have a birthday on the other $364$ days of the year, so the probability all of them do is $\left(\dfrac{364}{365}\right)^{N-1}$. Therefore, $$b(N) = \mathbb{E}[T] = N \cdot \left(\dfrac{364}{365}\right)^{N-1}$$.

$$$$

The question implies that there are two integer values of $n$ that yield the same value of $b(n)$. We can note that $b(n)$ is increasing for a while and then decreasing. Therefore, the two values of $n$ must be consecutive. Thus, we just need to find a value $n'$ such that $b(n') = b(n'+1)$. Our answer would then be $n' + (n'+1) = 2n' + 1$. The equation $b(n') = b(n' + 1)$ means $$n' \cdot \left(\dfrac{364}{365}\right)^{n' - 1} = (n' + 1) \left(\dfrac{364}{365}\right)^{n'} \iff n' = \dfrac{364}{365}n' + \dfrac{364}{365} \iff n' = 364$$ Therefore, our answer is $2 \cdot 364 + 1 = 729$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "729"
    ],
    "companies": [
      {
        "company": "Millennium Management"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "S5HGcLhulyWyz0yhKuWu",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:14:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 899392,
    "source": "Millenium OA",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Birthday Off",
    "topic": "probability",
    "urlEnding": "birthday-off",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Millennium Management"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "S5HGcLhulyWyz0yhKuWu",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Birthday Off",
    "topic": "probability",
    "urlEnding": "birthday-off"
  }
}
```
