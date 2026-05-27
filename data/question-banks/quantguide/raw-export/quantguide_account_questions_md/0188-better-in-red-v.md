# QuantGuide Question

## 188. Better in Red V

**Metadata**

- ID: `tg86kDCrIznZZpEB1Szy`
- URL: https://www.quantguide.io/questions/better-in-red-v
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Citadel
- Source: Kaushik - Discord
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-30 09:44:48 America/New_York
- Last Edited By: Gabe

### 题干

The surfaces of a $3 \times 3 \times 3$ cube (initially white) are painted red. The large cube is then cut up into $27$ $1 \times 1 \times 1$ small cubes. One of the small cubes is selected uniformly at random and is rolled twice. The face appearing is red both times. What is the probability the cube selected was a corner cube?

### Hint

Given that we have new information entering this problem (both rolls of the selected mini cube yielded a red face shown), use Bayes Theorem to update the probability that the chosen cube was a corner.

### 解答

Given that we have new information entering this problem (both rolls of the selected mini cube yielded a red face shown), we need to update the probability that the chosen cube was a corner. Thus, we have to use Bayes Theorem. Let $C$ be the event of picking a corner cube and $R_2$ be the event that the chosen cube shows a red face twice when rolled twice. Then we have:
$$\mathbb{P}[C \mid R_2] = \dfrac{\mathbb{P}[R_2 \mid C]\cdot\mathbb{P}[C]}{\mathbb{P}[R_2]}$$
The probability we roll a red face on a corner cube is $\frac{3}{6}$. Thus the probability we roll a red face twice on a corner cube is $(\frac{3}{6})^2=\frac{1}{4}$. Thus $\mathbb{P}[R_2 \mid C]=\frac{1}{4}$. 
$$$$
Since there are $8$ total corner cubes out of a total of $27$, $\mathbb{P}[C]=\frac{8}{27}$.
$$$$
Finally, the probability we roll a red face twice is $\frac{1}{4}\cdot\frac{8}{27}$ from corner pieces, $(\frac{1}{3})^2\cdot\frac{12}{27}$ from edge pieces (two red faces), and $(\frac{1}{6})^2\cdot\frac{6}{27}$ from center side pieces (one red face). 
$$$$
Putting this all together we get:
$$\mathbb{P}[C \mid R_2] = \dfrac{\mathbb{P}[R_2 \mid C]\cdot\mathbb{P}[C]}{\mathbb{P}[R_2]}=\dfrac{\frac{1}{4}\cdot\frac{8}{27}}{\frac{1}{4}\cdot\frac{8}{27}+\frac{1}{9}\cdot\frac{12}{27}+\frac{1}{36}\cdot\frac{6}{27}} = \dfrac{4}{7}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/7"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tg86kDCrIznZZpEB1Szy",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 09:44:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1456756,
    "source": "Kaushik - Discord",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better in Red V",
    "topic": "probability",
    "urlEnding": "better-in-red-v",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "tg86kDCrIznZZpEB1Szy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better in Red V",
    "topic": "probability",
    "urlEnding": "better-in-red-v"
  }
}
```
