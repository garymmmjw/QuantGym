# QuantGuide Question

## 723. 20-30 Die Split III

**Metadata**

- ID: `36l3hzURS7cf8DDGgkn9`
- URL: https://www.quantguide.io/questions/2030-die-split-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street, DRW, Citadel
- Source: edited js question
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 6
- Last Edited: 2023-9-27 21:09:29 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob have fair $30-$sided and $20-$sided dice, respectively. The goal for each player is to have the largest value on their die. Alice and Bob both roll their dice. However, Bob has the option to re-roll his die in the event that he is unhappy with the outcome. He can't see Alice's die beforehand. Bob then keeps the value of the new die roll. In the event of a tie, Bob is the winner. Assuming optimal play by Bob, find the probability Alice is the winner.

### Hint

Let $W$ be the event Alice wins. First, we want to find $\mathbb{P}[W]$. Let $A$ and $B$ be value of Alice's roll and Bob's first roll, respectively. The key here is to condition on whether or not $A \leq 20$. Bob is going to roll again whenever $\mathbb{P}[W \mid B = b] > \mathbb{P}[W]$.

### 解答

Let $W$ be the event Alice wins. First, we want to find $\mathbb{P}[W]$. Let $A$ and $B$ be value of Alice's roll and Bob's first roll, respectively. The key here is to condition on whether or not $A \leq 20$. Namely, this means $$\mathbb{P}[W] = \mathbb{P}[W \mid A \leq 20] \mathbb{P}[A \leq 20] + \mathbb{P}[W \mid A > 20] \mathbb{P}[A > 20]$$ We can quickly see that $\mathbb{P}[A \leq 20] = \dfrac{2}{3}$, as this accounts for $20$ of $30$ equally-likely values. If $A > 20$, then clearly Alice wins regardless of what Bob obtains, so $\mathbb{P}[W \mid A > 20] = 1$.$$$$ If $A \leq 20$, then we are really rolling $2$ independent $20-$sided fair dice. Namely, to compute $\mathbb{P}[W \mid A \leq 20]$, we see that the probability of a tie is $\dfrac{1}{20}$, as there are $20$ values they can agree upon out of $20^2 = 400$ outcomes. Therefore, the probability the two rolls are different is $\dfrac{19}{20}$. Because of the fact that the two dice are symmetric, $\mathbb{P}[A > B] = \dfrac{1}{2} \cdot \dfrac{19}{20} = \dfrac{19}{40}$, as when the two rolls are not the same, it is equally-likely whether $A > B$ or $A < B$.

$$$$

Combining these all together, we see that $\mathbb{P}[W] = \dfrac{1}{3} \cdot 1 + \dfrac{2}{3} \cdot \dfrac{19}{40} = \dfrac{39}{60}$. Now, Bob is going to roll again whenever $\mathbb{P}[W \mid B = b] > \mathbb{P}[W] = \dfrac{39}{60}$. This is because he wants to minimize Alice's chance of winning. It is easy to see that $\mathbb{P}[W \mid B = b] = 1-\dfrac{b}{30}$, as Alice just needs to roll a value of at least $b+1$.

$$$$

We just need to find the maximum value of $b$, say $b^*$, such that $\mathbb{P}[W \mid B = b] = 1 - \dfrac{b}{30} > \dfrac{39}{60}$. Solving this inequality, we get that $b \leq 10.5$, so $b^* = 10$ is the maximum value that Bob rolls again. Let $W_1$ be the event that Alice wins in this new game where Bob can roll again. We have that $$\mathbb{P}[W_1] = \mathbb{P}[W] + \dfrac{10}{20}\left(\mathbb{P}[W] - \mathbb{P}[W \mid B \leq 10]\right)$$ We get this because of the fact that Bob rolls again with probability $\dfrac{1}{2}$, which is when he rolls at most $10$. Then, the probability Alice wins is going to change by $\mathbb{P}[W] - \mathbb{P}[W \mid B \leq 10]$.

$$$$

To calculate $\mathbb{P}[W \mid B \leq 10]$, this is simply just average all the cases where $B = b$ for $1 \leq b \leq 10$, as when $B \leq 10$, the value is uniformly distributed on the first $10$ positive integers. Therefore, $$\mathbb{P}[W \mid B \leq 10] = \dfrac{1}{10}\displaystyle \sum_{b=1}^{10} 1 - \dfrac{b}{30} = \dfrac{49}{60}$$ Therefore, we get that $$\mathbb{P}[W] = \dfrac{39}{60} + \dfrac{1}{2}\left(\dfrac{39}{60} - \dfrac{49}{60}\right) = \dfrac{17}{30}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/30"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "36l3hzURS7cf8DDGgkn9",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 21:09:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5896881,
    "source": "edited js question",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "20-30 Die Split III",
    "topic": "probability",
    "urlEnding": "2030-die-split-iii",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "36l3hzURS7cf8DDGgkn9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "20-30 Die Split III",
    "topic": "probability",
    "urlEnding": "2030-die-split-iii"
  }
}
```
