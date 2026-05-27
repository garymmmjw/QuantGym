# QuantGuide Question

## 452. Soccer Practice

**Metadata**

- ID: `T2qDZ3f3FclRV6EZuSTA`
- URL: https://www.quantguide.io/questions/soccer-practice
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Citadel
- Source: N/A
- Tags: Conditional Probability, Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-23 11:28:04 America/New_York
- Last Edited By: Gabe

### 题干

You're practicing soccer by taking $100$ penalty kicks. Assume that you have made the first goal but missed the second. For each of the following kicks, the probability that you score is the fraction of goals you've made thus far. For example, if you made 17 goals out of the first 30 attempts, then the probability that you make the 31st goal is $\frac{17}{30}$. After 100 attempts, including the first two, what is the probability that you score exactly $66$ penalty kicks?

### Hint

Break down the problem. What is the probability of making exactly 1 successful kick? What is the probability of making exactly 2 successful kicks? What is the probability of making exactly $n$ successful kicks?

### 解答

Among the 98 remaining penalty kicks, you must score exactly 65, which occurs ${98 \choose 65}$ ways. Let us now find the probability of each one of these outcomes occurring. The denominator of the probability must be $99!$, which is the product of the total number of kicks at each time step ($\frac{1}{2} \times \frac{x}{3} \times \frac{y}{4} \times ... = \frac{z}{99!}$). Similarly, the numerator must be $65! \times 33!$, since there must be exactly 65 successful kicks and exactly 33 failed kicks. Thus, the probability of any such arrangement of is $\frac{65! 33!}{99!}$, and the probability that you score exactly 66 penalty kicks is: $${98 \choose 65} \times \frac{65! \times 33!}{99!} = \frac{1}{99}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/99"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "T2qDZ3f3FclRV6EZuSTA",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-23 11:28:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3592110,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Soccer Practice",
    "topic": "probability",
    "urlEnding": "soccer-practice",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "T2qDZ3f3FclRV6EZuSTA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Soccer Practice",
    "topic": "probability",
    "urlEnding": "soccer-practice"
  }
}
```
