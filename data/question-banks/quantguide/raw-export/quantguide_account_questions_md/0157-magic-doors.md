# QuantGuide Question

## 157. Magic Doors

**Metadata**

- ID: `o2ffJG8A8GxitZ036GGR`
- URL: https://www.quantguide.io/questions/magic-doors
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:11:47 America/New_York
- Last Edited By: Gabe

### 题干

John is trapped in a room with five indistinguishable doors. Behind two of the doors are paths to freedom; one path is two miles long, and the other path is five miles long. Behind three of the doors are paths that magically lead back to the room; one path is three miles long, another path is four miles long, and the final path is one mile long. If John returns to the room, the order of the doors are scrambled and the five doors are once again indistinguishable. How many miles will John travel before reaching freedom?

### Hint

When John is inside the room, the probability of John selecting any one of the five doors is $\frac{1}{5}$. If John selects one of the doors that leads back to the room, he has the same probability of picking any one of the five doors. How can you write an equation that models this?

### 解答

When John is inside the room, the probability of John selecting any one of the five doors is $\frac{1}{5}$. If John selects one of the doors that leads back to the room, he has the same probability of picking any one of the five doors. So, we can write the following relationship for random variable $X$, which represents the total distance traveled before reaching freedom: \[\begin{aligned}    \mathbb{E}[X] &= \frac{1}{5} \left(\mathbb{E}[X] + 3 \right) + \frac{1}{5} \left(\mathbb{E}[X] + 4 \right) + \frac{1}{5} \left(\mathbb{E}[X] + 1 \right) + \frac{1}{5} \left(2 \right) + \frac{1}{5} \left(5 \right) \\    &= \frac{3}{5} \mathbb{E}[X] + \frac{15}{5}\\    \Rightarrow \mathbb{E}[X] &= \frac{5}{2} \cdot \frac{15}{5} = \frac{15}{2}\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15/2"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "o2ffJG8A8GxitZ036GGR",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:11:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1170748,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Magic Doors",
    "topic": "probability",
    "urlEnding": "magic-doors",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "o2ffJG8A8GxitZ036GGR",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Magic Doors",
    "topic": "probability",
    "urlEnding": "magic-doors"
  }
}
```
