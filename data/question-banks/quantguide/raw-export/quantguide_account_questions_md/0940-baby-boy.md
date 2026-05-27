# QuantGuide Question

## 940. Baby Boy

**Metadata**

- ID: `1uced1N88E3CagD8OFz6`
- URL: https://www.quantguide.io/questions/baby-boy
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, DE Shaw
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:12:24 America/New_York
- Last Edited By: Gabe

### 题干

A hospital nursery has $3$ baby boys and an unknown number of baby girls. A mother just gave birth to a child of unknown gender and it is added to the nursery. The doctor then picks up a random child in the nursery and it is a baby boy. Assuming that births of boys and girls are equally likely, find the probability that the mother just gave birth to a boy.

### Hint

Assume there are $g$ girls in the nursery. How many total children would there be? Let $C$ represent the event that the doctor chose a boy and $B$ represent the event that the mother just had a boy. What is the event you are looking for the probability of and apply Bayes' Rule.

### 解答

Let $g$ be the number of girls in the nursery. Let $C$ represent the event that the doctor chose a boy and $B$ represent the event that the mother just had a boy. Then there are $4+g$ total children in the nursery. We want $\mathbb{P}[B \mid C]$. By Bayes' Theorem, this is $\dfrac{\mathbb{P}[C \mid B]\mathbb{P}[B]}{\mathbb{P}[C]}$. We can choose a boy with the mother just birthing a boy vs. the mother just birthing a girl. Thus, $\mathbb{P}[C] = \mathbb{P}[C \mid B]\mathbb{P}[B] + \mathbb{P}[C \mid B^c]\mathbb{P}[B^c]$.

$$$$

$\mathbb{P}[C \mid B] = \dfrac{4}{g+4}$, as the new child being a boy means there are $4$ boys and $g$ girls. $\mathbb{P}[C \mid B^c] = \dfrac{3}{g+4}$, as the new child being a girl means there are $3$ boys and $g+1$ girls. Plugging all of these in, we have that $$\mathbb{P}[B \mid C] = \dfrac{\frac{4}{g+4} \cdot \frac{1}{2}}{\frac{4}{g+4} \cdot \frac{1}{2} + \frac{3}{g+4} \cdot \frac{1}{2}} = \dfrac{4}{7}$$

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
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1uced1N88E3CagD8OFz6",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:12:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7692757,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Baby Boy",
    "topic": "probability",
    "urlEnding": "baby-boy",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "id": "1uced1N88E3CagD8OFz6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Baby Boy",
    "topic": "probability",
    "urlEnding": "baby-boy"
  }
}
```
