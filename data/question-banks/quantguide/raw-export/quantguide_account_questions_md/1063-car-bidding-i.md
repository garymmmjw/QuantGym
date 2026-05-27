# QuantGuide Question

## 1063. Car Bidding I

**Metadata**

- ID: `xbP4rKEwTJWAxsfyNaqb`
- URL: https://www.quantguide.io/questions/car-bidding-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:16:02 America/New_York
- Last Edited By: Gabe

### 题干

Fred is selling his old car. He will sell it to the first bidder that places a bid of at least $\$9000$. He receives bids for the car that are all independent and identically distributed exponential random variables with mean $\$5000$. Find the expected number of bids that Fred receives before selling his car. This is inclusive of the bid that he receives that makes him sell the car. The answer is in the form $e^a$ for a rational number $a$. Find $a$.

### Hint

What is the distribution of the number of bids Fred receives before selling his car? What is the probability that a bid exceeds $\$9000$?

### 解答

Let $B$ be the distribution of the bid prices. We first want to obtain $\mathbb{P}[B > 9000]$, as this will give us the success probability for the event we want to observe for the first time. We have that $B \sim \text{Exp}\left(\dfrac{1}{5000}\right)$, as $B$ has mean $5000$. Therefore, using the CDF of $B$, $$\mathbb{P}[B > 9000] = 1 - \mathbb{P}[B \leq 9000] = 1 - \left(1 - e^{-\frac{9}{5}}\right) = e^{-\frac{9}{5}}$$ Therefore, if $N$ gives the number bids needed to have the first bid accepted, $N \sim \text{Geom}(e^{-\frac{9}{5}})$. By properties of geometric distributions, $\mathbb{E}[N] = e^{\frac{9}{5}}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xbP4rKEwTJWAxsfyNaqb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:16:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8641864,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Car Bidding I",
    "topic": "statistics",
    "urlEnding": "car-bidding-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "xbP4rKEwTJWAxsfyNaqb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Car Bidding I",
    "topic": "statistics",
    "urlEnding": "car-bidding-i"
  }
}
```
