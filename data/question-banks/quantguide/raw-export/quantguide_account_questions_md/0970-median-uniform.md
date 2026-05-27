# QuantGuide Question

## 970. Median Uniform

**Metadata**

- ID: `wjO1R2jbvKtGyKpldPVl`
- URL: https://www.quantguide.io/questions/median-uniform
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG interview
- Tags: Combinatorics, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 10:55:30 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,X_3 \sim \text{Unif}(0,3)$ IID. Find the probability that $X_{(2)}$, the median of the three random variables, is between $1$ and $2$.

### Hint

Split up the interval $(0,3)$ into three subintervals $(0,1], (1,2],$ and $(2,3)$. Each $X_i$ has equal chance of landing in each of the three subintervals. Label the random variables $1-3$, based on which interval they end up in. Therefore, we want the probability the median is in $2$. 

### 解答

We can approach this with an intuitive perspective, as the random variables here are uniformly distributed. Split up the interval $(0,3)$ into three subintervals $(0,1], (1,2],$ and $(2,3)$. Each $X_i$ has equal chance of landing in each of the three subintervals. Label the random variables $1-3$, based on which interval they end up in. Therefore, we want the probability the median is in $2$. Let's consider the different permutations that allow that to happen:

$$122, 123, 223, 222$$

These are the different ways the values of the intervals can be assigned to the random variables. All that remains is to count the permutations. There are $3$ ways to assign the values $122$ to the three random variables (select the random variable that receives $1$ in $3$ ways, the other $2$ receive $2$). Similarly, there are $3! = 6$ ways for $123$, $3$ ways for $223$, and $1$ way for $222$. Adding these all up, there are $3 + 6 + 3 + 1 = 13$ permutations of the values. Then, there are $3^3 = 27$ equally-likely ways to assign the values to the random variables in general. Therefore, the answer is $\dfrac{13}{27}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13/27"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wjO1R2jbvKtGyKpldPVl",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 10:55:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7913804,
    "source": "SIG interview",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Median Uniform",
    "topic": "probability",
    "urlEnding": "median-uniform",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "wjO1R2jbvKtGyKpldPVl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Median Uniform",
    "topic": "probability",
    "urlEnding": "median-uniform"
  }
}
```
