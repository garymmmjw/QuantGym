# QuantGuide Question

## 395. Disc EV

**Metadata**

- ID: `mISHCuKSDFBlsI9FJAp3`
- URL: https://www.quantguide.io/questions/disc-ev
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:59 America/New_York
- Last Edited By: Gabe

### 题干

A point $(X,Y)$ is selected uniformly at random from the unit disc. Find $\mathbb{E}[XY]$.

### Hint

Consider $(-X,Y)$. For any point $(x,y)$ in our circle, we know that $(-x,y)$ has the same probability density, as we are uniform over the circle. Note also that our circle is symmetric about reflections over the axes.

### 解答

For any point $(x,y)$ in our circle, we know that $(-x,y)$ has the same probability density, as we are uniform over the circle. Note also that our circle is symmetric about reflections over the axes. The effect of operation $(x,y) \mapsto (-x,y)$ is a reflection of our unit disc across the $y-$axis. This means that the joint distribution of $(X,Y)$ is the same as the joint distribution of $(-X,Y)$. In particular, this means $\mathbb{E}[XY] = \mathbb{E}[(-X)Y] = -\mathbb{E}[XY]$. This means that $\mathbb{E}[XY] = 0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "mISHCuKSDFBlsI9FJAp3",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3093227,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Disc EV",
    "topic": "probability",
    "urlEnding": "disc-ev",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "mISHCuKSDFBlsI9FJAp3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Disc EV",
    "topic": "probability",
    "urlEnding": "disc-ev"
  }
}
```
