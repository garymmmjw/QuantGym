# QuantGuide Question

## 871. Basketball Practice

**Metadata**

- ID: `MX1u6Ld6gNiFXDCkZ1Od`
- URL: https://www.quantguide.io/questions/basketball-practice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Green Book
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:55:38 America/New_York
- Last Edited By: Gabe

### 题干

Frank is shooting free throws. He makes his first free throw and misses his second free throw. For $n \geq 3$, the probability of making the $n$th free throw is equal to the proportion of free throws he made during his first $n-1$ attempts. What is the probability that Frank makes exactly 50 free throws in 100 attempts?

### Hint

Work out $n = 3,4,5$ and notice a pattern

### 解答

Consider $n = 3$. There are two possible outcomes: Frank makes 2 total free throws, or Frank makes 1 total free throw. Each occurs with probability $\frac{1}{2}$. Next, consider $n = 4$. If Frank makes 3 total free throws, then he must have made every free throw beginning with $n = 3$. This occurs with probability $\frac{1}{2} \cdot \frac{2}{3} = \frac{1}{3}$. If Frank makes 2 total free throws, then he either misses the 3rd free thrown or the 4th free throw, which occurs with probability $\frac{1}{2} \cdot \frac{1}{3} + \frac{1}{2} \cdot \frac{1}{3} = \frac{1}{3}$. If Frank makes 1 total free throw, then he must have missed both the 3rd and 4th free throws, which occurs with probability $\frac{1}{2} \cdot \frac{2}{3} = \frac{1}{3}$. We are already starting to see a pattern here, but we'll keep going for $n = 5$ just to confirm our suspicions. If Frank makes 4 total free throws, then he must have made every free throw beginning with $n = 3$, which occurs with probability $\frac{1}{2} \cdot \frac{2}{3} \cdot \frac{3}{4} = \frac{1}{4}$. If Frank makes 3 total free throws, then he misses on either the 3rd, 4th, or 5th attempt, which occurs with probability $\frac{1}{2} \cdot \frac{2}{3} \cdot \frac{1}{4} + \frac{1}{2} \cdot \frac{1}{3} \cdot \frac{2}{4} + \frac{1}{2} \cdot \frac{1}{3} \cdot \frac{2}{4} = \frac{1}{4}$. Similarly, if Frank makes 2 total free throws, then he makes it on either the 3rd, 4th, or 5th attempt, which occurs with probability $\frac{1}{2} \cdot \frac{2}{3} \cdot \frac{1}{4} + \frac{1}{2} \cdot \frac{1}{3} \cdot \frac{2}{4} + \frac{1}{2} \cdot \frac{1}{3} \cdot \frac{2}{4} = \frac{1}{4}$. If Frank makes 1 total free throw, then he must have missed every attempt beginning with $n = 3$, which occurs with probability $\frac{1}{2} \cdot \frac{2}{3} \cdot \frac{3}{4} = \frac{1}{4}$. Following this pattern, we see that the probability of achieving any number of throws on by the $n$-th attempt is just $\frac{1}{n-1}$. So our solution for this problem is $\frac{1}{99}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/99"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "MX1u6Ld6gNiFXDCkZ1Od",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:55:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7098821,
    "randomizable": "",
    "source": "Green Book",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Basketball Practice",
    "topic": "probability",
    "urlEnding": "basketball-practice"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "MX1u6Ld6gNiFXDCkZ1Od",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Basketball Practice",
    "topic": "probability",
    "urlEnding": "basketball-practice"
  }
}
```
