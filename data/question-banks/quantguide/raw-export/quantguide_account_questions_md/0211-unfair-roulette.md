# QuantGuide Question

## 211. Unfair Roulette

**Metadata**

- ID: `IYldSgR07oVbsQKn1kur`
- URL: https://www.quantguide.io/questions/unfair-roulette
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 13:29:41 America/New_York
- Last Edited By: Gabe

### 题干

Gabe has a revolver with six chambers, and he convinces his friend Miriam to play a round of modified Russian roulette with him. He loads two bullets into the gun such that there is exactly one empty chamber between the two loaded chambers. He points the gun at his forehead, pulls the trigger, and survives. He offers Miriam the gun and gives her a choice to either point the gun at herself and pull the trigger (Option $1$) or add a third bullet to the gun, randomly spin the cylinder, and then point the gun at herself and pull the trigger (Option $2$). Which option should she choose to optimize her probability of survival? Enter $1$ for Option $1$, $2$ for Option $2$, or $3$ if the two options are equally optimal.

### Hint

If Miriam chooses Option $1$, then her chance of survival is conditioned on the fact that Gabe survived the first round. What could the ordering of the bullets be that allow for this to be the case?

### 解答

Consider Option $2$ first. The probability that Miriam survives in this case is $1/2$, since there are $3$ loaded chambers out of $6$ total chambers. Now, let's consider Option $1$. Let $B$ denote the event that Gabe survives the first shot, or in other words, the event that the first chamber is empty. Let $A$ denote the event that Miriam survives the next shot, or in other words, the event that the second chamber is empty. If Miriam chooses Option $1$, then her chance of survival is conditioned on the fact that Gabe survived the first trigger-pull. We therefore wish to determine: $$     \mathbb{P}(A \,|\, B) = \frac{\mathbb{P}(A \cap B)}{\mathbb{P}(B)} $$ The probability of the first two chambers being empty is $1/3$, and the probability of the first chamber being empty is $2/3$. To visualize this, consider all the possible arrangements of the bullets within the cylinder, where $E$ denotes an empty chamber and $N$ denotes a non-empty chamber.      $$NENEEE$$     $$ENENEE$$     $$EENENE$$     $$EEENEN$$     $$NEEENE$$     $$ENEEEN$$ Simplifying, we find: $$     \mathbb{P}(A \,|\, B) = \frac{\mathbb{P}(A \cap B)}{\mathbb{P}(B)} = \frac{1/ 3}{2 / 3} = \frac{1}{2}$$ Option $1$ gives Miriam the same survival chance as Option $2$, so our answer is $3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IYldSgR07oVbsQKn1kur",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:29:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1653794,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Unfair Roulette",
    "topic": "probability",
    "urlEnding": "unfair-roulette",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "IYldSgR07oVbsQKn1kur",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Unfair Roulette",
    "topic": "probability",
    "urlEnding": "unfair-roulette"
  }
}
```
