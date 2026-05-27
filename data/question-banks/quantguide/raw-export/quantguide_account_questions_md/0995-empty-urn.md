# QuantGuide Question

## 995. Empty Urn

**Metadata**

- ID: `ENkqSk3L9ToRxd2n4RGn`
- URL: https://www.quantguide.io/questions/empty-urn
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:20:07 America/New_York
- Last Edited By: Gabe

### 题干

We flip a fair coin until we obtain our first heads. If the first heads occurs on the $k$th flip, we are given $k$ balls. We put them into 3 bins labeled 1,2, and 3 at random. Find the probability that none of the three bins are empty.

### Hint

Condition on the number of times the coin was flipped before seeing the first tails to leverage the Inclusion-Exclusion Principle.

### 解答

Let $E_i$ be the event that bin $i$ is empty. We want $\mathbb{P}[E_1^c\cap E_2^c \cap E_3^c] = 1 - \mathbb{P}[E_1 \cup E_2 \cup E_3]$. We compute $\mathbb{P}[E_1\cup E_2 \cup E_3]$ by first using the Law of Total Expectation, as we do not know the number of balls $k$ that we are distributing. Thus, $\mathbb{P}[E_1 \cup E_2 \cup E_3] = \sum_{k=1}^{\infty} \mathbb{P}[E_1 \cup E_2 \cup E_3 \mid H_k]\mathbb{P}[H_k]$. $H_k$ here is the event that the first head occurs on the $k$th flip. From our work previously, $\mathbb{P}[H_k] = \dfrac{1}{2^k}$, so:

$$\mathbb{P}[E_1 \cup E_2 \cup E_3 \mid H_k] = \binom{3}{1}\mathbb{P}[E_1 \mid H_k] - \binom{3}{2}\binom{3}{2}\mathbb{P}[E_1E_2 \mid H_k] + \binom{3}{3}\mathbb{P}[E_1E_2E_3 \mid H_k]$$

The last probability is $0$ as it is impossible for all 3 bins to be empty. $\mathbb{P}[E_1E_2 \mid H_k] = \left(\dfrac{1}{3}\right)^k$, as we need all balls to go into bin 3. $\mathbb{P}[E_1 \mid H_k] = \left(\dfrac{2}{3}\right)^k$, as we need all the balls to go into bins 2 or 3, which occurs with probability $\dfrac{2}{3}$ per ball. Hence, $\mathbb{P}[E_1E_2E_3 \mid H_k] = 3\left(\dfrac{2}{3}\right)^k - 3\left(\dfrac{1}{3}\right)^k$, and:

\[\begin{aligned}
    \mathbb{P}[E_1 \cup E_2 \cup E_3] &= \sum_{k=1}^{\infty}\left[3\left(\dfrac{2}{3}\right)^k - 3\left(\dfrac{1}{3}\right)^k\right]\left(\dfrac{1}{2}\right)^k \\ &= 3 \sum_{k=1}^{\infty} \dfrac{1}{3^k} - 3 \sum_{k=1}^{\infty} \dfrac{1}{6^k} \\ &= 3\left(\dfrac{\frac{1}{3}}{1 - \frac{1}{3}} - \dfrac{\frac{1}{6}}{1 - \frac{1}{6}}\right) \\ &= \dfrac{9}{10}
\end{aligned}\]

Finally, we have that $\mathbb{P}[E_1^cE_2^cE_3^c] = 1 - \dfrac{9}{10} = \dfrac{1}{10}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/10"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "ENkqSk3L9ToRxd2n4RGn",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:20:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8133396,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Empty Urn",
    "topic": "probability",
    "urlEnding": "empty-urn",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "ENkqSk3L9ToRxd2n4RGn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Empty Urn",
    "topic": "probability",
    "urlEnding": "empty-urn"
  }
}
```
