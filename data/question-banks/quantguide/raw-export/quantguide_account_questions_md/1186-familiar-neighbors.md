# QuantGuide Question

## 1186. Familiar Neighbors

**Metadata**

- ID: `a4twpmPQSWkRehPLywKf`
- URL: https://www.quantguide.io/questions/familiar-neighbors
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: gabe book
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$2n$ people, $n > 1$, are seated randomly at a circular table with $2n$ seats for the $2023$ Ballon D'Or Ceremony. The $2n$ people have distinct labels $0,1,\dots, 2n-1$, where the person with label $i$ knows exactly $i$ of the other $2n-1$ people at the table. Note that just because person $A$ knows person $B$, that does not imply person $B$ knows person $A$. Find the expected proportion of people that know at least one of the people on either side of them.

### Hint

Let $X_i$ be the indicator of the event that the person who knows exactly $i$ other people, $0 \leq i \leq 2n-1$, knows at least one of their neighbors. The rest is a lot of messy algebra.

### 解答

Let $X_i$ be the indicator of the event that the person who knows exactly $i$ other people, $0 \leq i \leq 2n-1$, knows at least one of their neighbors. Then $\displaystyle T = \sum_{i=0}^{2n-1} X_i$ gives the total number of people that know at least one of their neighbors. Therefore, the proportion of people that know their neighbors is $P = \dfrac{T}{2n}$. We use linearity of expectation to find $\mathbb{E}[T]$.

$$$$

By Linearity of Expectation, $\displaystyle \mathbb{E}[T] = \sum_{i=0}^{2n-1}\mathbb{E}[X_i]$. Note that the $X_i$ in this case do NOT have the same expectation, as the probabilities are different depending on how many people are known. Let's compute $\mathbb{E}[X_k]$ for any $0 \leq k \leq 2n-1$. $\mathbb{E}[X_k]$ is just the probability that the person with exactly $k$ known people of the other $2n-1$ has at least one person on either side of them that they know. This is just the same as $1 - $ the probability of the complement, which is that they know neither of the people sitting beside them. Since each arrangement is equally likely, the probability that they don't know the person sitting on one side of them is $\dfrac{2n-1-k}{2n-1}$. Given that they don't the person on one side, the probability they don't know the person on the other side either is $\displaystyle \dfrac{2n-2-k}{2n-2}$. Thus, $\mathbb{E}[X_k] = 1 - \dfrac{(2n-1-k)(2n-2-k)}{(2n-1)(2n-2)}$. Therefore, $$\displaystyle \mathbb{E}[T] = 2n - \dfrac{1}{(2n-1)(2n-2)}\sum_{k=0}^{2n-1}(2n-1-k)(2n-2-k) = 2n - \dfrac{1}{(2n-1)(2n-2)}\sum_{k=0}^{2n-1}\left[(2n-1)(2n-2) - (4n-3)k + k^2\right]$$ $$= 2n - \dfrac{1}{(2n-1)(2n-2)}\left[2n(2n-1)(2n-2) - (4n-3)\sum_{k=0}^{2n-1}k + \sum_{k=0}^{2n-1}k^2\right]$$ Simplifying the sums, we get the above equal to $$\displaystyle \dfrac{1}{(2n-1)(2n-2)} \left[(4n-3)\cdot \dfrac{(2n-1)(2n)}{2} - \dfrac{(2n-1)(2n)(4n-1)}{6}\right] = \dfrac{(4n-3)n}{2n-2} - \dfrac{n(4n-1)}{3(2n-2)}$$ Expanding the numerators and combining, we get $\dfrac{4n^2 - 3n - \frac{4}{3}n^2 + \frac{n}{3}}{2n-2} = \dfrac{\frac{8}{3}n^2 - \frac{8}{3}n}{2(n-1)} = \dfrac{4}{3}n$.

$$$$

Thus, we have that $\mathbb{E}[P] = \dfrac{\frac{4}{3}n}{2n} = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "difficulty": "medium",
    "id": "a4twpmPQSWkRehPLywKf",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9851363,
    "source": "gabe book",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Familiar Neighbors",
    "topic": "probability",
    "urlEnding": "familiar-neighbors"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "a4twpmPQSWkRehPLywKf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Familiar Neighbors",
    "topic": "probability",
    "urlEnding": "familiar-neighbors"
  }
}
```
