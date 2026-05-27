# QuantGuide Question

## 887. Colorless Sides

**Metadata**

- ID: `FGlYqfhf5vBAJKjTzhMf`
- URL: https://www.quantguide.io/questions/colorless-sides
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, SIG, Jane Street, Hudson River Trading
- Source: Kaushik - Citadel QT Phone
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-10-29 22:36:08 America/New_York
- Last Edited By: Kaushik

### 题干

A $3×3×3$ cube that is colored red on the outside is cut into $27$ $1×1×1$ smaller cubes. A random cube is selected from these $27$ and you see five sides without any color. What is the probability that the cube has one colored side?

### Hint

Since we are updating probabilities given new information, try using Bayes Theorem. 

### 解答

Given that we have new information entering this problem (that we can see $5$ sides are not painted), we need to update the probability that the chosen cube has a colored side. Thus, we have to use Bayes theorem. Let $S$ be the event of the cube having exactly one colored side and $B$ being the event that the five sides of the cube shown are blank. Then we have
$$\mathbb{P}[S \mid B] = \dfrac{\mathbb{P}[B \mid S]\cdot\mathbb{P}[S]}{\mathbb{P}[B]}$$
There's a $\frac{1}{6}$ chance that a one colored side cube has the painted side not showing. Thus $\mathbb{P}[B \mid S] = \frac{1}{6}$. And since there's $6$ cubes that have only one painted face out of $27$. Thus $\mathbb{P}[S] = \frac{6}{27} = \frac{2}{9}$. Finally, the probability we have a cube that shows five unpainted sides is $\frac{1}{6}\cdot\frac{2}{9}$ from the cubes with one painted side and $1\cdot\frac{1}{27}$ from the center cube with no painted sides. Combining everything together we get
$$\mathbb{P}[S \mid B] = \dfrac{\mathbb{P}[B \mid S]\cdot\mathbb{P}[S]}{\mathbb{P}[B]} = \dfrac{\frac{1}{6}\cdot\frac{2}{9}}{\frac{1}{6}\cdot\frac{2}{9}+1\cdot\frac{1}{27}}=\dfrac{1}{2}$$


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
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "FGlYqfhf5vBAJKjTzhMf",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:36:08 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 7292652,
    "source": "Kaushik - Citadel QT Phone",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Colorless Sides",
    "topic": "probability",
    "urlEnding": "colorless-sides",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "FGlYqfhf5vBAJKjTzhMf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Colorless Sides",
    "topic": "probability",
    "urlEnding": "colorless-sides"
  }
}
```
