# QuantGuide Question

## 709. Parking Rush

**Metadata**

- ID: `0xF2scnTY4xW7ebT6x08`
- URL: https://www.quantguide.io/questions/parking-rush
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability, Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-14 00:41:45 America/New_York
- Last Edited By: Michael

### 题干

There are 10 parking spots in front of QuantGuide headquarters. By 9:00 AM, all 10 parking spots are occupied. QuantGuide's 3 executives head home early in the afternoon, vacating their parking spots at random times distributed independently and uniformly between 12:00 PM and 3:00 PM. Andy is one of QuantGuide's 9 lazy employees; lazy employees arrive at the office at random times distributed independently and uniformly between 12:00 PM and 3:00 PM. If a parking spot is vacant when a lazy employee arrives, then that employee will occupy that spot until 5:00 PM. Otherwise, the lazy employee will call in sick and return home. What is the probability that Andy calls in sick?

### Hint

Let $E_1, E_2, E_3$ denote the times at which the 3 executives leave. Let $L_1, L_2, \ldots, L_9$ denote the times at which the 9 latecomers arrive. Note that since $E_1, E_2, E_3, L_1, L_2, \ldots, L_9 \overset{\text{iid}}{\sim} \text{Unif}([12, 15])$, by symmetry, any ordering of $E_1, E_2, E_3, L_1, L_2, \ldots, L_9$ by increasing time of day occurs with equal probability. Break into cases based on the number of empty spots available at.

### 解答

Let $E_1, E_2, E_3$ denote the times at which the 3 executives leave. Let $L_1, L_2, \ldots, L_9$ denote the times at which the 9 latecomers arrive. Note that since $E_1, E_2, E_3, L_1, L_2, \ldots, L_9 \overset{\text{iid}}{\sim} \text{Unif}([12, 15])$, by symmetry, any ordering of $E_1, E_2, E_3, L_1, L_2, \ldots, L_9$ by increasing time of day occurs with equal probability. $$$$Suppose we are ordering 3 $E$s and 9 $L$s. Consider any arbitrary ordering of the 3 $E$s and 9 $L$s. If the ordering allows all spots to be filled by 3:00 PM, then we can assign Andy to 3 of the 9 $L$s. So, the probability that Andy gets a parking spot conditioned on the event that all spots are filled by 3:00 PM is $\frac{1}{3}$. $$$$In the other case, the probability should intuitively be less than $\frac{1}{3}$, because not all parking spots can be filled. For example, consider the following ordering: $LLLLLLLLLEEE$. No matter which $L$ we assign Andy to, there is no chance that he will find an empty parking spot. $$$$Now that we've gained a bit more intuition, we can now properly divide our problem up into 4 cases: (A) there are 3 empty parking spots at 3:00 PM, (B) there are 2 empty parking spots at 3:00 PM, (C) there is 1 empty parking spot at 3:00 PM, and (D) there are no empty parking spots at 3:00 PM. Note that there are a total of $\binom{12}{3} = 220$ possible orderings of 3 $E$s and 9 $L$s. Let $S$ denote the event that Andy finds a parking spot. $$$$Case A: There are 3 empty parking spots at 3:00 PM. The only way for there to be 3 empty parking spots at 3:00 PM is with the following ordering: $LLLLLLLLLEEE$. This ordering occurs with probability $\frac{1}{220}$. Then, \[\begin{aligned}    \mathbb{P}\left(S \cap A\right) &= \mathbb{P}\left(S \,|\, A\right) \mathbb{P}(A) \\    &= 0 \cdot \frac{1}{220} \\    &= 0\end{aligned}\] Case B: There are 2 empty parking spots at 3:00 PM. One way for this to occur is if the last two letters are both $E$, of which there are $\binom{10}{9} = 10$ possible orderings. But this includes the case where the last three letters are all $E$, so we must subtract $1$. In addition, $LLLLLLLLEELE$, $LLLLLLLLEEEL$ work. In this case, there is exactly one $L$ that Andy may be assigned to such that he is able to park. Hence, \[\begin{aligned}    \mathbb{P}\left(S \cap B\right) &= \mathbb{P}\left(S \,|\, B\right) \mathbb{P}(B) \\    &= \frac{1}{9} \cdot \frac{11}{220} \\    &= \frac{1}{180}\end{aligned}\]  Case C: There is 1 empty parking spot at 3:00 PM. One way for this to occur is if the last letter is an $E$, which occurs in $\binom{11}{2} = 55$ orderings. But this includes the case where two or more of the final letters are $E$, as well as the case $LLLLLLLLEELE$, so we must subtract $10 + 1 = 11$. In addition, $LLLLLLLEEELL$, $LLLLLLLEELEL$, as well as any ordering ending with $EEL$ except for the ordering ending with $EEEL$ (there are $\binom{9}{8} - 1= 8$ such orderings) work. If one parking spot is vacant at 3:00 PM, then there are 2 $L$s that Andy may be assigned to such that Andy has a parking spot. \[\begin{aligned} \mathbb{P}\left(S \cap C\right) &= \mathbb{P}\left(S ,|, C\right) \mathbb{P}(C) \ &= \frac{2}{9} \cdot \frac{54}{220} \ &= \frac{3}{55} \end{aligned}\]  Case D: There are no empty parking spots at 3:00 PM. There are $220 - 54 - 11 - 1 = 154$ orderings remaining. As previously discussed, if no parking spots are empty at 3:00 PM, then there are 3 $L$s that Andy may be assigned to such that Andy has a parking spot. \[\begin{aligned} \mathbb{P}\left(S \cap D\right) &= \mathbb{P}\left(S ,|, D\right) \mathbb{P}(D) \ &= \frac{3}{9} \cdot \frac{154}{220} \ &= \frac{7}{30} \end{aligned}\] Now, we may employ the law of total probability. \[\begin{aligned} \mathbb{P}(S) &= \mathbb{P}\left(S \cap A\right) + \mathbb{P}\left(S \cap B\right) + \mathbb{P}\left(S \cap C\right) + \mathbb{P}\left(S \cap D\right) \ &= 0 + \frac{1}{180} + \frac{3}{55} + \frac{7}{30} \ &= \frac{581}{1980} \end{aligned}\]  The complement of the union of these events is:  \[\begin{aligned} 1 -  \frac{581}{1980} = \frac{1399}{1980}\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1399/1980"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "0xF2scnTY4xW7ebT6x08",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:41:45 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 5787458,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Parking Rush",
    "topic": "probability",
    "urlEnding": "parking-rush",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "0xF2scnTY4xW7ebT6x08",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Parking Rush",
    "topic": "probability",
    "urlEnding": "parking-rush"
  }
}
```
