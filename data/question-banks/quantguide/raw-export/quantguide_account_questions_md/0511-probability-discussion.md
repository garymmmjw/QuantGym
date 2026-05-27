# QuantGuide Question

## 511. Probability Discussion

**Metadata**

- ID: `1aOMKCupChcilUGzqmGu`
- URL: https://www.quantguide.io/questions/probability-discussion
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, GSA Capital, Jane Street, Akuna, Belvedere Trading, SIG
- Source: og
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-3 09:36:36 America/New_York
- Last Edited By: Gabe

### 题干

Gabe and a student have decided to meet up to discuss probability. The student is very prompt and will show up at a uniformly random time between $4$ and $5$ PM. Gabe is a tad late, so he will show up at a uniformly random time between $4:30$ and $5$ PM. For whichever person gets there first, they will wait up to 10 minutes, and if the other person has not shown up, they will leave. Find the probability that the meeting occurs.

### Hint

Let $G$ and $S$ be the number of minutes after 4 PM that Gabe and the student show up, respectively. Then we have that $G \sim \text{Unif}(30,60)$ and $S \sim \text{Unif}(0,60)$. What is the event that the meeting occurs in terms of $G$ and $S$?

### 解答

First, let's model this mathematically. Let $G$ and $S$ be the number of minutes after 4 PM that Gabe and the student show up, respectively. Then we have that $G \sim \text{Unif}(30,60)$ and $S \sim \text{Unif}(0,60)$. The event that the meeting occurs is the just the event that $|G-S| \leq 10$, as they must differ by up to $10$ minutes. $$$$We should draw out the region in the plane to see what we are working with. If you put $G$ on the $x$-axis and $S$ on the $y$-axis, we have a tall rectangle. When drawing the two lines corresponding to $|G-S| \leq 10$, you will notice that it is easier to calculate the probability of the complement, as those are easier regions to work with. You will see that there is one trapezoid and one triangle. It is easy enough to use some basic algebra to note that the slope is $1$, so the line will go as far vertically as it does horizontally. You will find that the base of the trapezoid is $30$, and the two heights are $20$ and $50$, so its area is $1050$. The two sides of the triangle are $20$ each, so the area is $200$. Thus, the probability of the complement is $\dfrac{25}{36}$. Thus, the probability in the question is $\dfrac{11}{36}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/36"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "1aOMKCupChcilUGzqmGu",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 09:36:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4090693,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Probability Discussion",
    "topic": "probability",
    "urlEnding": "probability-discussion",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "1aOMKCupChcilUGzqmGu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Probability Discussion",
    "topic": "probability",
    "urlEnding": "probability-discussion"
  }
}
```
