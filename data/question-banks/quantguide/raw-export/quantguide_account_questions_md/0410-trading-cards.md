# QuantGuide Question

## 410. Trading Cards

**Metadata**

- ID: `GSufXepnY4OBJnw0Jrzt`
- URL: https://www.quantguide.io/questions/trading-cards
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events, Combinatorics, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:30:51 America/New_York
- Last Edited By: Gabe

### 题干

Dan loads up a box with $N \sim \text{Poisson}(6)$ trading cards. He wants to choose 4 cards from this box to take with him to a convention. Find the expected numbers of ways that Dan can select the 4 cards. Note that $\displaystyle \binom{n}{k} = 0$ if $n < k$. 

### Hint

If there are $n$ objects in the box, how many ways can Dan select 4 of them? Apply LOTUS to this with $n$ replaced by $N$.

### 解答

We want to find $\mathbb{E}\left[\displaystyle \binom{N}{4}\right]$, where $N \sim \text{Poisson}(6)$. This is because there are $\binom{n}{4}$ ways to pick the cards when there are $n$ cards in the box. Thus, using LOTUS, $\displaystyle \mathbb{E}\left[\displaystyle \binom{N}{4}\right] = \sum_{n=0}^{\infty} \binom{n}{4} \cdot \mathbb{P}[X = n]$. However, we know that for $n < 4$, the binomial coefficient is $0$, so we can really start this summation at $4$, so this is $\displaystyle \sum_{n=4}^{\infty} \dfrac{n!}{4!(n-4)!} \cdot \dfrac{6^n}{n!}e^{-6} = \dfrac{e^{-6}}{4!}\sum_{n=4}^{\infty} \dfrac{6^n}{(n-4)!}$.

$$$$

The trick here is to try to get a $n-4$ in the exponent of the $6^n$ and then index shift our summation to be from $n=0$ to $\infty$. To do this, we take out $6^4$ from the exponent to get $\dfrac{6^4 e^{-6}}{4!} \displaystyle \sum_{n=4}^{\infty} \dfrac{6^{n-4}}{(n-4)!}$. Now, we index shift back by $4$ to let $v = n-4$ so that the sum ranges from $v = 0$ to $\infty$ and we obtain $\dfrac{6^4 e^{-6}}{4!} \displaystyle \sum_{v=0}^{\infty} \dfrac{6^v}{v!}$. This last summation is just $e^6$, so our answer is $\dfrac{6^4}{4!} = 54$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "54"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "GSufXepnY4OBJnw0Jrzt",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:30:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3222088,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Trading Cards",
    "topic": "probability",
    "urlEnding": "trading-cards"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "GSufXepnY4OBJnw0Jrzt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Trading Cards",
    "topic": "probability",
    "urlEnding": "trading-cards"
  }
}
```
