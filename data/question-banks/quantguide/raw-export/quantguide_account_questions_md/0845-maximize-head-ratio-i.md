# QuantGuide Question

## 845. Maximize Head Ratio I

**Metadata**

- ID: `21Czqn77XQ3puU8Bjr5i`
- URL: https://www.quantguide.io/questions/maximize-head-ratio-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG Question (https://quizlet.com/542824675/sig-flash-cards/)
- Tags: Discrete Random Variables, Games
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:42:03 America/New_York
- Last Edited By: Gabe

### 题干

Say that you are flipping a fair coin where you can stop flipping whenever you want. Your goal is to maximize the ratio between the number of heads you get with the total number of flips. The ratios are in the form $a:1$. What is the expectation of “a” when your strategy is to target a ratio of $0.5:1$ in a long run of flips but if its greater than $0.5:1$, you immediately stop there.

### Hint

If you get heads on the first flip, should you flip again?

### 解答

Half of the time you will get a heads on the first flip and your ratio would be $1:1$. This is the best ratio you could achieve playing this game so you stop there. The other half of the time you get tails on the first flip (current ratio $0:1$). However, due to the law of large numbers, you know that the more you flip, the ratio of heads to total flips will get closer and closer to $0.5:1$. Thus the expected ratio is $0.5*1+0.5*0.5 = 0.75$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.75",
      "3/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "21Czqn77XQ3puU8Bjr5i",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:42:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6915748,
    "source": "SIG Question (https://quizlet.com/542824675/sig-flash-cards/)",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Maximize Head Ratio I",
    "topic": "brainteasers",
    "urlEnding": "maximize-head-ratio-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "21Czqn77XQ3puU8Bjr5i",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Maximize Head Ratio I",
    "topic": "brainteasers",
    "urlEnding": "maximize-head-ratio-i"
  }
}
```
