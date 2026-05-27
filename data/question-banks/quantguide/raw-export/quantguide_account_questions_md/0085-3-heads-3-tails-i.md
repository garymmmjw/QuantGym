# QuantGuide Question

## 85. 3 Heads 3 Tails I

**Metadata**

- ID: `iic2AVFuqf6BrAbPj90f`
- URL: https://www.quantguide.io/questions/3-heads-3-tails-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG Glassdoor
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 10:40:03 America/New_York
- Last Edited By: Gabe

### 题干

Anna and Brenda are playing a game. They repeatedly toss a coin. Anna wins if 3 heads appear. Brenda wins if 3 tails appear. The heads and tails do not need to be consecutive. What is the expected number of coin tosses for a winner to be determined?

### Hint

The probability that Anna wins is $\dfrac{1}{2}$ by symmetry. Further, the expected total number of tosses for Anna to win is equal to the expected total number of tosses for Brenda to win by symmetry. By the law of total expectation, our desired answer is simply double the expected total number of tosses for Anna to win.

### 解答

The probability that Anna wins is $\dfrac{1}{2}$ by symmetry. Further, the expected total number of tosses for Anna to win is equal to the expected total number of tosses for Brenda to win by symmetry. By the law of total expectation, our desired answer is simply double the expected total number of tosses for Anna to win. Anna wins in 3 total tosses with probability $\dfrac{1}{8}$. Anna wins in 4 total tosses with probability $\dfrac{3}{16}$ (there are 3 arrangements of 3 heads and 1 tail such that the last flip is heads). Anna wins in 5 total tosses with probability $\dfrac{6}{32}$ (there are 6 arrangements of 3 heads and 2 tails such that the last flip is tails). Putting it all together, we find the expected number of tosses for Anna to win is $$\dfrac{1}{8} \cdot 3 + \dfrac{3}{16} \cdot 4 + \dfrac{6}{32} \cdot 5 = \dfrac{66}{32}$$ Multiplying by 2 gives us $\dfrac{33}{8}$.  

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "33/8"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "iic2AVFuqf6BrAbPj90f",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 10:40:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 573828,
    "source": "SIG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "3 Heads 3 Tails I",
    "topic": "probability",
    "urlEnding": "3-heads-3-tails-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "iic2AVFuqf6BrAbPj90f",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "3 Heads 3 Tails I",
    "topic": "probability",
    "urlEnding": "3-heads-3-tails-i"
  }
}
```
