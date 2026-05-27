# QuantGuide Question

## 510. Birth Paradox

**Metadata**

- ID: `GZXdFoKmBozw9M5ayapR`
- URL: https://www.quantguide.io/questions/birth-paradox
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: cambridge
- Tags: Conditional Probability, Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:20:30 America/New_York
- Last Edited By: Gabe

### 题干

A family has 2 children, of which we know one is a boy born on a Friday. Assuming that each birthday and gender is equally likely, as well as independent of one another, find the probability that the family has 2 boys.

### Hint

Letting $G$ denote a girl, $B$ denote a boy not born on a Friday, and $B^*$ denote a boy born on a Friday, you have at least one boy born on a Friday when you have $B^*B, B^*B^*, B^*G$. Note the potential orderings of the children as well.

### 解答

Let $B^*$ denote a boy born on a Friday, and let $B$ denote a boy not born on a Friday. Additionally, let $G$ denote a girl. The two ways we can obtain 2 boys is if they are both born on a Friday, or if only one of them is born on a Friday. We know at least one is a boy born on a Friday, so $BB$ is not possible. The total ways to obtain at least one boy born on a Friday is to have the two cases above OR have one boy born on a Friday and one girl (irrelevant which day she is born on). Thus, we want $\dfrac{\mathbb{P}[B^*B^* \cup B^*B]}{\mathbb{P}[B^*B^* \cup B^*B \cup B^*G]}$. I am disregarding order of birth here, which will account for later. These are all disjoint events, so by the Kolmogorov Axioms on the probability measure, we can separate out each of the individual events and take the sum of their probabilities. We can assume independence upon gender from birth to birth, equally likely probabilities of birth on any given day of the week, and independence between day of the week of birth and gender. We can find easily find $\mathbb{P}[B^*] = \dfrac{1}{2} \cdot \dfrac{1}{7} = \dfrac{1}{14}$ and $\mathbb{P}[B] = \dfrac{1}{2} \cdot \dfrac{6}{7} = \dfrac{6}{14}$. Thus, since there is independence from birth to birth, $\mathbb{P}[B^*B^*] = \dfrac{1}{14} \cdot \dfrac{1}{14} = \dfrac{1}{196}$ and $\mathbb{P}[B^*B] = 2 \cdot \dfrac{1}{14} \cdot \dfrac{6}{14} = \dfrac{12}{196}$. Note the factor of $2$ out front, as we can arrange the location of the boy born on a Friday to either be the first born or the second born, so there are 2 arrangements. Lastly, $\mathbb{P}[B^*G] = 2 \cdot \dfrac{1}{14} \cdot \dfrac{1}{2} = \dfrac{14}{196}$. Factor of $2$ out front for same reason as above. Thus, we have our final probability as $$\dfrac{\mathbb{P}[B^*B^* \cup B^*B]}{\mathbb{P}[B^*B^* \cup B^*B \cup B^*G]} = \dfrac{\mathbb{P}[B^*B^*] + \mathbb{P}[B^*B]}{\mathbb{P}[B^*B^*] + \mathbb{P}[B^*B] + \mathbb{P}[B^*G]} = \dfrac{\frac{1}{196} + \frac{12}{196}}{\frac{1}{196} + \frac{12}{196} + \frac{14}{196}} = \dfrac{13}{27}$$

$$$$

How do we reconcile this increase due to something seemingly irrelevant?  It is much easier to have a boy born on a Friday if you have two boys than one boy. So if we have the information that a boy is born on a Friday, it is more likely that there are two boys.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13/27"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GZXdFoKmBozw9M5ayapR",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:20:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4080748,
    "source": "cambridge",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birth Paradox",
    "topic": "probability",
    "urlEnding": "birth-paradox",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "GZXdFoKmBozw9M5ayapR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birth Paradox",
    "topic": "probability",
    "urlEnding": "birth-paradox"
  }
}
```
