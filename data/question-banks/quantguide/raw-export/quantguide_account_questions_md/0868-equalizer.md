# QuantGuide Question

## 868. Equalizer

**Metadata**

- ID: `4OGLfhdxjExevTyrS93o`
- URL: https://www.quantguide.io/questions/equalizer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO, edited
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Dave and Mike each have a fair $6-$sided die. They both roll at once. If they roll the same value, Mike wins. If Mike rolls a strictly larger value than Dave, then Dave wins. If Dave rolls a strictly larger value than Mike, then they both re-roll until one of the other two outcomes occurs. Find the probability that Mike wins this game.

### Hint

Let $p$ be the probability that Mike wins. If they roll the same value, which occurs with probability $\dfrac{1}{6}$, then Mike wins with probability $1$. The probability that Mike rolls a strictly larger or smaller value than Dave are equal by symmetry of the dice. 

### 解答

Let $p$ be the probability that Mike wins. If they roll the same value, which occurs with probability $\dfrac{1}{6}$, then Mike wins with probability $1$. The probability that Mike rolls a strictly larger or smaller value than Dave are equal by symmetry of the dice. Namely, they are $\dfrac{1-\frac{1}{6}}{2} = \dfrac{5}{12}$. If Dave rolls a strictly larger value than Mike, then Mike wins with probability $p$. If Mike rolls a strictly larger value than Dave, then Mike does not win i.e. wins with probability $0$. Therefore, by Law of Total Probability, this can be written as $$p = \dfrac{1}{6} \cdot 1 + \dfrac{5}{12} \cdot p$$ Solving this yields $p = \dfrac{2}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/7"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "4OGLfhdxjExevTyrS93o",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7079056,
    "randomizable": "",
    "source": "MAO, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Equalizer",
    "topic": "probability",
    "urlEnding": "equalizer"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "4OGLfhdxjExevTyrS93o",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Equalizer",
    "topic": "probability",
    "urlEnding": "equalizer"
  }
}
```
