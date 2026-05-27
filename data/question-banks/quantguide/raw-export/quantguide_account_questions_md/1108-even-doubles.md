# QuantGuide Question

## 1108. Even Doubles

**Metadata**

- ID: `m5oOHXlLAw2yvV0vTxsi`
- URL: https://www.quantguide.io/questions/even-doubles
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: N/A
- Tags: Events, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:10:19 America/New_York
- Last Edited By: Gabe

### 题干

Andre flips a fair coin until he obtains two consecutive heads or tails for the first time. Find the probability that Andre flips the coin an even amount of times. 

### Hint

How many such sequences of length $2k$ are there that satisfy this? Think about what must happen before the last two flips.

### 解答

Let $E$ be this event and $N$ be the number of tosses needed until two consecutive heads or tails appear. Then $\mathbb{P}[E] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[N = 2k]$, as we want an even amount of flips needed. Let's find the term inside. The event $\{N = 2k\}$ means that the last two flips must be either $HH$ or $TT$. However, once we select the last two flips, the other $2k-2$ flips must be fixed. Namely, they must alternate between $H$ and $T$, with the starting flip based on which ending we have. For example, if $\{N = 4\}$ this correspond to the two sequences $THTT$ and $HTHH$. Therefore, of the $2^{2k}$ possible sequences of length $k$, exactly $2$ satisfy our event, so $\mathbb{P}[T = 2k] = \dfrac{2}{2^{2k}} = \dfrac{2}{4^k}$. Plugging this into our previous sum, $$\mathbb{P}[E] = 2\displaystyle \sum_{k=1}^{\infty} \dfrac{1}{4^k} = 2 \cdot \dfrac{\frac{1}{4}}{1 - \frac{1}{4}} = \dfrac{2}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "m5oOHXlLAw2yvV0vTxsi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:10:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9064473,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Even Doubles",
    "topic": "probability",
    "urlEnding": "even-doubles"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "m5oOHXlLAw2yvV0vTxsi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Even Doubles",
    "topic": "probability",
    "urlEnding": "even-doubles"
  }
}
```
