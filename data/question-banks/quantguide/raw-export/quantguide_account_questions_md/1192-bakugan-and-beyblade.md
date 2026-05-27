# QuantGuide Question

## 1192. Bakugan and Beyblade

**Metadata**

- ID: `G0rJhPriCNDygL97XuW8`
- URL: https://www.quantguide.io/questions/bakugan-and-beyblade
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables, Discrete Random Variables, Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:54:24 America/New_York
- Last Edited By: Gabe

### 题干

Two machines independently manufacture Bakugan and Beyblade toys. The time it takes each machine to produce a toy is Exp$(1)$ distributed. The manufacturing time is independent of all other toys. Assume there is no delay between when a machine produces a toy to when it starts the next toy. Find the probability that the third Bakugan is manufactured before the second Beyblade.

### Hint

When a toy is produced at all, it is equally likely to be a Bakugan or a Beyblade. The reason is because of the memorylessness property and the fact that they have equal rates of production.


### 解答

The key to this question is the following realization: When a toy is produced at all, it is equally likely to be a Bakugan or a Beyblade. The reason is because of the memorylessness property and the fact that they have equal rates of production.

$$$$

By the memorylessness property, the knowledge of when the last Bakugan/Beyblade was produced tells us nothing about when the next one will be produced, so we can just treat it as if we were looking at the probability the first Beyblade comes before the first Bakugan (or vice versa), which is just $\dfrac{1}{2}$. So now, we can treat this as a sequence of coin flips, where Bakugan is Heads and Beyblades is tails. Reframing this problem, this just asks for the probability the $3$rd heads comes before the second tails. This will always be decided after the $5$th flip. Thus, we really want the number of outcomes where there are at least $3$ Heads in the first $4$ coin tosses. The distribution of the number of heads in the first $4$ coin tosses is $N \sim \text{Binom}(4,0.5)$, so we want $\mathbb{P}[N=3]+ \mathbb{P}[N=4] = \dfrac{5}{16}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/16"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "G0rJhPriCNDygL97XuW8",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:54:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9878692,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bakugan and Beyblade",
    "topic": "probability",
    "urlEnding": "bakugan-and-beyblade"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "G0rJhPriCNDygL97XuW8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bakugan and Beyblade",
    "topic": "probability",
    "urlEnding": "bakugan-and-beyblade"
  }
}
```
