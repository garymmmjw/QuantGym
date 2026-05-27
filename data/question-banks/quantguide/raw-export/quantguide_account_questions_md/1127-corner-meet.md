# QuantGuide Question

## 1127. Corner Meet

**Metadata**

- ID: `Zn6t9Tjtx5PafSSrHQrV`
- URL: https://www.quantguide.io/questions/corner-meet
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: sean
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-11 15:01:43 America/New_York
- Last Edited By: Gabe

### 题干

You have a $5 \times 5$ checkerboard. You randomly place a checker in the center $3 \times 3$ grid. The checkers can move in two equally random ways: up to the left, and up to the right. If the checker is on the boundary, then it can only make valid moves. What is the probability that the checker ends up in the top-left or top-right corner?

### Hint

Look at the probability of reaching a corner from each of the center squares in the $3 \times 3$ grid. Consider the top-left inner square, for example. We see that we have probability $\frac{1}{2}$ of immediately reaching the left corner and probability $\frac{1}{2}$ of reaching the top-center, in which case there's no chance of reaching a corner. 

### 解答

Let's look at the probability of reaching a corner from each of the center $3$ x $3$ grid. We can see that there are $5$ squares that have some possibility of reaching the corner. We can use law of total probability. First, we have a equal chance of selecting each of the $9$ inner squares. From here, we can look at the probability of reaching a corner from each square. This can be done in a recursive manner, working from top to bottom. 


$$$$

First, let's look at the top-left square in the inner $3$ x $3$ grid. We see that we have probability $\frac{1}{2}$ of immediately reaching the left corner and probability $\frac{1}{2}$ of reaching the top-center, in which case there's no chance of reaching a corner. Hence, we have overall probability $\frac{1}{2}$. By symmetry, the top-right square has the same probability. We can see that the top-center square of the $3$ x $3$ grid has zero probability of reaching a corner. We can iterate downwards, and see that we can calculate probabilities of the lower squares using the probabilities that we just calculated. 

This gives us $$\frac{1}{9}\left(\frac{1}{2}+\frac{1}{2}+\frac{1}{2}+\frac{1}{2}+\frac{1}{2}\right)=\frac{5}{18}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/18"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Zn6t9Tjtx5PafSSrHQrV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 15:01:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9284263,
    "source": "sean",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Corner Meet",
    "topic": "probability",
    "urlEnding": "corner-meet",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "Zn6t9Tjtx5PafSSrHQrV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Corner Meet",
    "topic": "probability",
    "urlEnding": "corner-meet"
  }
}
```
