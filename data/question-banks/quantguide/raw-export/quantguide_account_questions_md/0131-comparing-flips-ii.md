# QuantGuide Question

## 131. Comparing Flips II

**Metadata**

- ID: `iRXVa6ZF0J4s4QxmjMse`
- URL: https://www.quantguide.io/questions/comparing-flips-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street, Akuna, Citadel, SIG, WorldQuant
- Source: N/A
- Tags: Expected Value, Conditional Expectation, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-14 23:55:15 America/New_York
- Last Edited By: Gabe

### 题干

You and your friend are playing a game with a fair coin, tossing it and writing down the outcomes. You win if HTH appears before HHT, else your friend wins. What is the probability that your friend wins? 

### Hint

Both sequences contain the subsequence HT, so imagine writing down an infinite number of toss outcomes and scanning for HT subsequences. When will HTH occur before HHT?

### 解答

Both sequences contain the subsequence HT, so imagine writing down an infinite number of toss outcomes and scanning for HT subsequences. In order for HTH to occur first, an H must not precede HT (else HHT occurs) and an H must succeed it (to create HTH). Hence, the probability HTH wins is $\frac{1}{2} \times \frac{1}{2} = \frac{1}{4}$ given there is an HT. In order for HHT to occur first, an H must precede HT, which happens with probability $\frac{1}{2}$ given there is an HT. Note that these are the only two outcomes that can occur and thus define our sample space $\frac{1}{2}+\frac{1}{4}=\frac{3}{4}$. The probability that your friend wins is $\frac{1}{2} \div \frac{3}{4} = \frac{2}{3}$ and the probability that you win is $\frac{1}{4} \div \frac{3}{4} = \frac{1}{3}$. In other words, HHT is twice as likely to occur before HTH.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "iRXVa6ZF0J4s4QxmjMse",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-14 23:55:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 914915,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Comparing Flips II",
    "topic": "probability",
    "urlEnding": "comparing-flips-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "iRXVa6ZF0J4s4QxmjMse",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Comparing Flips II",
    "topic": "probability",
    "urlEnding": "comparing-flips-ii"
  }
}
```
