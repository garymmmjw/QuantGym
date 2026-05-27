# QuantGuide Question

## 756. Better in Red III

**Metadata**

- ID: `UjXZZDOBqwt12ab8sJ8x`
- URL: https://www.quantguide.io/questions/better-in-red-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, Jane Street, SIG, Hudson River Trading
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 7
- Last Edited: 2023-10-29 16:24:35 America/New_York
- Last Edited By: Gabe

### 题干

A $3\times 3 \times 3$ cube is composed of $27$ $1\times 1 \times 1$ cubes that are white by default. All the surfaces of the $3 \times 3 \times 3$ cube are painted red and then the cube is disassembled such that all orientations of all cubes are equally likely. You select a random small cube and notice that all 5 sides that are visible to you are white. What is the probability the last face not visible to you is red?

### Hint

Consider Bayes' Rule and the orientation of the cube.

### 解答

Let $R$ be the event that the last side not visible to you is red and $W$ be the event that the other sides visible are not red. We want $\mathbb{P}[R \mid W] = \dfrac{\mathbb{P}[R \cap W]}{\mathbb{P}[W]}$. For $\mathbb{P}[R \cap W]$, we need the last side to be red and have that side be facing away from us. Since the orientation is random, the probability the red side is facing away from us is $\dfrac{1}{6}$. In addition, $6$ of the $27$ cubes have exactly one red side, so $\mathbb{P}[R \cap W] = \dfrac{1}{27}$. Then, in the denominator, we can have 5 white sides from choosing a cube that would satisfy the numerator event or just choosing the center cube. The center cube is white on all sides so there is no need to orient it. Therefore, $\mathbb{P}[W] = \dfrac{1}{27} + \dfrac{1}{27} = \dfrac{2}{27}$. Substituting in, we get $\mathbb{P}[R \mid W] = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "UjXZZDOBqwt12ab8sJ8x",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 16:24:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6167527,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better in Red III",
    "topic": "probability",
    "urlEnding": "better-in-red-iii",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "UjXZZDOBqwt12ab8sJ8x",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better in Red III",
    "topic": "probability",
    "urlEnding": "better-in-red-iii"
  }
}
```
