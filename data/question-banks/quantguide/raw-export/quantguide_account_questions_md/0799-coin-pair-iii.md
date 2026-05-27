# QuantGuide Question

## 799. Coin Pair III

**Metadata**

- ID: `ZnhlRTpY39Jx9M37R1Vt`
- URL: https://www.quantguide.io/questions/coin-pair-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: Jane Street
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Four fair coins appear in front of you. You flip all four at once and observe the outcomes of the coins. After seeing the outcomes, you may flip any pair of tails again. You may not flip a single coin without flipping another. You can iterate this process as many times as there are at least two tails to flip. Find the expected number of heads that we end up with after this process is complete.

### Hint

Four fair coins appear in front of you. You all four at once and observe the outcomes of the coins. After seeing the outcomes, you may flip any pair of tails again. You may not flip a single coin without flipping another. You can iterate this process as many times as there are at least two tails to flip. Find the expected number of heads that we end up with after this process is complete.

### 解答

Let $T$ be the total number of heads and $X$ be the total number of heads that appear on the first flipping of the coins. Then $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X]] = \sum_{k=0}^{4}\mathbb{E}[T \mid X =k]\mathbb{P}[X = k]$ by Law of Total Expectation. $X \sim \text{Binom}\left(4,\dfrac{1}{2}\right)$ because $X$ counts the number of heads appearing in $4$ flips of a fair coin. 

$$$$

If $X = 4$, then obviously we don't flip any coins again, so $\mathbb{E}[T \mid X = 4] = 4$. Similarly, if $X = 3$, then we aren't able to flip just one tails, so $\mathbb{E}[T \mid X = 3] = 3$. 

$$$$

If $X = 2$, then we are going to continually flip the two tail coins again until we don't obtain $TT$. Conditioned on the fact that we don't obtain $TT$, $2$ of the $3$ equally-likely outcomes result in us having $3$ heads, while $1$ of the $3$ results in having $4$ heads, so $\mathbb{E}[T \mid X = 2] = \dfrac{2}{3} \cdot 3 + \dfrac{1}{3} \cdot 4 = \dfrac{10}{3}$.

$$$$

Iterating this logic, if $X = 1$, then we flip two tails until they don't appear $TT$. With probability $\dfrac{2}{3}$ we end up with $2$ heads, but we can iterate the process again from there on the remaining two tails and reach an expected $\dfrac{10}{3}$ heads. With probability $\dfrac{1}{3}$, we reach $3$ heads and we're done. Therefore, $\mathbb{E}[T \mid X = 1] = \dfrac{2}{3} \cdot \dfrac{10}{3} + \dfrac{1}{3} \cdot 3 = \dfrac{29}{9}$.

$$$$

Lastly, if $X = 0$, with probability $\dfrac{2}{3}$, we end up with $1$ head, so we can iterate the process again to have an expected number of heads of $\dfrac{29}{9}$. With probability $\dfrac{1}{3}$, we end up with $2$ heads, and we iterate the process again to get an expected number of heads of $\dfrac{10}{3}$. Therefore, $$\mathbb{E}[T \mid X = 0] = \dfrac{2}{3} \cdot \dfrac{29}{9} + \dfrac{1}{3} \cdot \dfrac{10}{3} = \dfrac{88}{27}$$

$$$$

Plugging the values and the PMF of $X$ into our expression from the beginning, we get that $$\mathbb{E}[T] = \dfrac{1}{16} \cdot 4 + \dfrac{4}{16} \cdot 3 + \dfrac{6}{16} \cdot \dfrac{10}{3} + \dfrac{4}{16} \cdot \dfrac{29}{9} + \dfrac{1}{16} \cdot \dfrac{88}{27} = \dfrac{88}{27}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "88/27"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "ZnhlRTpY39Jx9M37R1Vt",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6544562,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair III",
    "topic": "probability",
    "urlEnding": "coin-pair-iii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "ZnhlRTpY39Jx9M37R1Vt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair III",
    "topic": "probability",
    "urlEnding": "coin-pair-iii"
  }
}
```
