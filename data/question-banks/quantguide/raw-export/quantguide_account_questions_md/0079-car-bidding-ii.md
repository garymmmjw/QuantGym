# QuantGuide Question

## 79. Car Bidding II

**Metadata**

- ID: `OoC9cfhbIIgiTlccpPLb`
- URL: https://www.quantguide.io/questions/car-bidding-ii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 09:59:09 America/New_York
- Last Edited By: Gabe

### 题干

Fred is selling his old car. He will sell it to the first bidder that places a bid of at least $\$9000$. He receives bids for the car that are all independent and identically distributed exponential random variables with mean $\$5000$. Given that Fred sells his car, what is the probability that he sells the car for at least $\$15000$? The answer is in the form $e^a$ for a rational number $a$. Find $a$.

### Hint

Use the memorylessness property of the exponential distribution.

### 解答

Let $B$ be the bid price. For the bid to be accepted, we know that $B > 9000$. We want to find the probability $B > 15000$, but we have this information from above, so we really want $\mathbb{P}[B > 15000 \mid B > 9000]$. By the memorylessness property, this is equivalent to asking $\mathbb{P}[B > 6000]$. Using the CDF of the exponential distribution, $$\mathbb{P}[B > 6000] = 1 - \mathbb{P}[B \leq 6000] = 1 - \left(1 - e^{-\frac{6}{5}}\right) = e^{-\frac{6}{5}}$$ Therefore, $a = -\dfrac{6}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-6/5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "OoC9cfhbIIgiTlccpPLb",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:59:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 539078,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Car Bidding II",
    "topic": "statistics",
    "urlEnding": "car-bidding-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "OoC9cfhbIIgiTlccpPLb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Car Bidding II",
    "topic": "statistics",
    "urlEnding": "car-bidding-ii"
  }
}
```
