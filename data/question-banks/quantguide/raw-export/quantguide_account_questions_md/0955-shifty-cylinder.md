# QuantGuide Question

## 955. Shifty Cylinder

**Metadata**

- ID: `LQcSEBjpG8NbDW3uongf`
- URL: https://www.quantguide.io/questions/shifty-cylinder
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:22:05 America/New_York
- Last Edited By: Gabe

### 题干

The radius of a cylinder is growing at a rate of $2$ meter per hour, and the height of the cylinder is decreasing at a rate of $5$ meters per hour. At what rate is the volume of the cylinder changing (in cubic meters per hour) at the instant where the base radius is $3$ meters and the height is $6$ meters? The answer is in the form $k\pi$ for a constant $k$. Find $k$.


### Hint

$$V(r,h) = \pi r^2 h$ is the volume of a cylinder as a function of $r$ and $h$. Apply product rule.

### 解答

$$V(r,h) = \pi r^2 h$ is the volume of a cylinder as a function of $r$ and $h$. Furthermore, we are given that $r' = 2$ and $h' = -5$ from the question. Therefore, we have that $V' = 2\pi r h r' + \pi r^2 h'$ by applying the product rule to the above. Plugging in all of our values, we get that the volume changes at a rate of $$2 \pi (3)(6)(2) + \pi (3)^2 (-5) = 27\pi$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "27"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "LQcSEBjpG8NbDW3uongf",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:22:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7795564,
    "source": "https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Shifty Cylinder",
    "topic": "pure math",
    "urlEnding": "shifty-cylinder",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "LQcSEBjpG8NbDW3uongf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Shifty Cylinder",
    "topic": "pure math",
    "urlEnding": "shifty-cylinder"
  }
}
```
