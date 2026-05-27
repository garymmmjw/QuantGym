# QuantGuide Question

## 496. Doubly Blue

**Metadata**

- ID: `zlQ9HQwVbvqJrNZ9plbd`
- URL: https://www.quantguide.io/questions/doubly-blue
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Hudson River Trading
- Source: HRT
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Three bowls are presented to you. One has two blue balls, one has two red balls, and the last has one red ball and one blue ball. You select one bowl uniformly at random and note that you drew a blue ball from it. You then draw from the same bowl again after replacing the ball you selected. Find the probability that you would draw a blue ball on this draw.

### Hint

Let $BB$ represent the event of drawing two blues and $B$ represent the event of the first ball being blue. Let $U_1$ represent the two blue urn, $U_2$ represent the two red urn, and then $U_3$ represent the mixed urn. We want $$\mathbb{P}[BB \mid B] = \dfrac{\mathbb{P}[BB]}{\mathbb{P}[B]}$$ Condition on the urn you are in.

### 解答

Let $BB$ represent the event of drawing two blues and $B$ represent the event of the first ball being blue. Let $U_1$ represent the two blue urn, $U_2$ represent the two red urn, and then $U_3$ represent the mixed urn. We want $$\mathbb{P}[BB \mid B] = \dfrac{\mathbb{P}[BB]}{\mathbb{P}[B]}$$ The equality above comes from the fact that $BB \subseteq B$. To calculate each, we just condition on the urn we are in. Namely, $$\mathbb{P}[B] = \mathbb{P}[B \mid U_1]\mathbb{P}[U_1] + \mathbb{P}[B \mid U_2]\mathbb{P}[U_2] + \mathbb{P}[B \mid U_3]\mathbb{P}[U_3]$$ Since the original urn is selected uniformly at random, $\mathbb{P}[U_1] = \mathbb{P}[U_2] = \mathbb{P}[U_3] = \dfrac{1}{3}$. Furthermore, we have that $\mathbb{P}[B \mid U_1] = 1, \mathbb{P}[B \mid U_2] = 0,$ and $\mathbb{P}[B \mid U_3] = \dfrac{1}{2}$ by the proportions of blue balls in each urn. Since we replace the ball between trials, to get $\mathbb{P}[BB \mid U_i]$, we just have to square $\mathbb{P}[B \mid U_i]$. This means that $$\mathbb{P}[B] = \dfrac{1 + 1/2 + 0}{3} = \dfrac{1}{2}$$ and $$\mathbb{P}[BB] = \dfrac{1 + 1/4 + 0}{3} = \dfrac{5}{12}$$ Therefore, the answer is $\mathbb{P}[BB \mid B] = \dfrac{5/12}{1/2} = \dfrac{5}{6}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/6"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "id": "zlQ9HQwVbvqJrNZ9plbd",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3942396,
    "source": "HRT",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Doubly Blue",
    "topic": "probability",
    "urlEnding": "doubly-blue"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "id": "zlQ9HQwVbvqJrNZ9plbd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Doubly Blue",
    "topic": "probability",
    "urlEnding": "doubly-blue"
  }
}
```
