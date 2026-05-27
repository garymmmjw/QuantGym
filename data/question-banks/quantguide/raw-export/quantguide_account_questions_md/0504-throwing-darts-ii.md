# QuantGuide Question

## 504. Throwing Darts II

**Metadata**

- ID: `7iXqMDNaps7TFFIDYQsq`
- URL: https://www.quantguide.io/questions/throwing-darts-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Citadel, DRW, Belvedere Trading
- Source: N/A
- Tags: Continuous Random Variables, Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:18:15 America/New_York
- Last Edited By: Gabe

### 题干

You throw 3 darts that land uniformly randomly on a circular dartboard composed of three concentric circles with radii 1ft, 2ft, and 3ft. Assuming the dart lands on the dartboard, what is the probability that at least one of the darts land in the inner ring (within the 1ft circle)? 

### Hint

What is the probability that none of the three darts land within the inner ring? How can you use complementary probability to find the answer?

### 解答

    We first want to calculate the probability of one dart landing in the inner ring. Because the dart lands uniformly at random on the board, we can calculate the probability as the ratio of the area of the inner ring to the area of the entire board. The area of the entire board is 9$\pi$ and the area of the inner ring is $1\pi$. Thus, the probability that the dart lands in the inner ring is:

    $$\frac{\pi}{9\pi} = \frac{1}{9}$$

    We now want to calculate the probability that at least one of our three darts will land in this inner circle. To do this, we will calculate the probability of not getting any darts in the inner ring, which is:

    $$\left(\frac{8}{9}\right)^3 = \frac{512}{729}$$

    Finally, we use the complement rule, $1 - P(A^c) = P(A)$ to come to the answer:

    $$1 - \frac{512}{729} = \frac{217}{729}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "217/729"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "7iXqMDNaps7TFFIDYQsq",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:18:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4014986,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Throwing Darts II",
    "topic": "probability",
    "urlEnding": "throwing-darts-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "7iXqMDNaps7TFFIDYQsq",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Throwing Darts II",
    "topic": "probability",
    "urlEnding": "throwing-darts-ii"
  }
}
```
