# QuantGuide Question

## 386. Random Particles

**Metadata**

- ID: `ERPRwgsSiPGtA93o6k1c`
- URL: https://www.quantguide.io/questions/random-particles
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:31:22 America/New_York
- Last Edited By: Gabe

### 题干

$$1000$ infinitesimal particles, each of which travels at a constant rate of one meter per second, are randomly placed along a line of meter length. When two particles collide, both immediately change direction and continue traveling at a constant rate of one meter per second. How long will it take for all of the particles to fall off of the line on average?

### Hint

Before a collision, two particles are going in opposite directions towards each other. After a collision, the two particles are still going in opposite directions, but now away from each other. Thus, you can imagine switching the labels of the two particles after the collision and its as if the collision never occurred.

### 解答

One key feature to note is the collision property. Before a collision, two particles are going in opposite directions towards each other. After a collision, the two particles are still going in opposite directions, but now away from each other. Thus, you can imagine switching the labels of the two particles after the collision and its as if the collision never occurred. Furthermore, there is no difference with regards to which direction a particle moves in due to symmetry. A particle at the $x$-th meter will fall off of the line in $x$ seconds, on average. If it were traveling in the other direction, you can set $x$ to $1-x$. Hence, the problem is asking for the expected value of the maximum of 1000 independent and identically distributed random variables that are distributed uniformly between 0 and 1. The expected value of the minimum for a uniform distribution of $n$ samples on $[0,1]$ is $\frac{n}{n+1}$, or $\frac{1000}{1001}$ for this problem.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1000/1001"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "ERPRwgsSiPGtA93o6k1c",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:31:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2981914,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Particles",
    "topic": "probability",
    "urlEnding": "random-particles"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "ERPRwgsSiPGtA93o6k1c",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Particles",
    "topic": "probability",
    "urlEnding": "random-particles"
  }
}
```
